/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  filter,
  map,
  toArray,
  of,
  mergeMap,
  defer,
  shareReplay,
  forkJoin,
  switchMap,
  merge,
  catchError,
  throwError,
  Observable,
} from 'rxjs';
import { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  conversationCreatedEvent,
  conversationUpdatedEvent,
  isMessageEvent,
  isToolResultEvent,
} from '../../../common/chat_events';
import { createChatError, isChatError } from '../../../common/errors';
import {
  type ConversationEvent,
  createUserMessage,
  createToolResult,
} from '../../../common/conversation_events';
import type { ChatEvent, ToolResultEvent, MessageEvent } from '../../../common/chat_events';
import type { Conversation } from '../../../common/conversations';
import { AgentFactory } from '../orchestration';
import { ConversationService, ConversationClient } from '../conversations';
import { generateConversationTitle } from './generate_conversation_title';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentFactory: AgentFactory;
}

export class ChatService {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;
  private readonly conversationService: ConversationService;
  private readonly agentFactory: AgentFactory;

  constructor({ inference, logger, conversationService, agentFactory }: ChatServiceOptions) {
    this.inference = inference;
    this.logger = logger;
    this.conversationService = conversationService;
    this.agentFactory = agentFactory;
  }

  converse({
    agentId,
    conversationId,
    connectorId,
    request,
    nextUserMessage,
  }: {
    agentId: string;
    connectorId: string;
    conversationId?: string;
    nextUserMessage: string;
    request: KibanaRequest;
  }) {
    const logError = (source: string, err: Error) => {
      this.logger.error(`Error during converse from ${source}:\n${err.stack ?? err.message}`);
    };

    const isNewConversation = !conversationId;
    const nextUserEvent = createUserMessage({ content: nextUserMessage });

    return forkJoin({
      agentRunner: defer(() => this.agentFactory.getAgentRunner({ request, connectorId, agentId })),
      conversationClient: defer(() => this.conversationService.getScopedClient({ request })),
      chatModel: defer(() =>
        this.inference.getChatModel({
          request,
          connectorId,
          chatModelOptions: {},
        })
      ),
    }).pipe(
      switchMap(({ conversationClient, chatModel, agentRunner }) => {
        const conversation$ = getConversation$({
          agentId,
          conversationId,
          conversationClient,
        });

        const conversationEvents$ = conversation$.pipe(
          map((conversation) => {
            return [...conversation.events, nextUserEvent];
          }),
          shareReplay()
        );

        const agentEvents$ = conversationEvents$.pipe(
          switchMap((conversationEvents) => {
            return defer(() => agentRunner.run({ previousEvents: conversationEvents }));
          }),
          switchMap((agentRunResult) => {
            return agentRunResult.events$;
          }),
          shareReplay()
        );

        // generate a title for the new conversations
        const title$ = isNewConversation
          ? generatedTitle$({ chatModel, conversationEvents$ })
          : conversation$.pipe(
              switchMap((conversation) => {
                return of(conversation.title);
              })
            );

        // extract new conversation events from the agent output
        const newConversationEvents$ = extractNewConversationEvents$({ agentEvents$ }).pipe(
          map((events) => {
            return [nextUserEvent, ...events];
          })
        );

        // save or update the conversation and emit the corresponding chat event
        const saveOrUpdateAndEmit$ = isNewConversation
          ? createConversation$({ agentId, title$, newConversationEvents$, conversationClient })
          : updateConversation$({
              title$,
              conversation$,
              conversationClient,
              newConversationEvents$,
            });

        return merge(agentEvents$, saveOrUpdateAndEmit$).pipe(
          catchError((err) => {
            logError('main observable', err);
            return throwError(() => {
              if (isChatError(err)) {
                return err;
              }
              return createChatError('internalError', err.message, {});
            });
          }),
          shareReplay()
        );
      })
    );
  }
}

const generatedTitle$ = ({
  chatModel,
  conversationEvents$,
}: {
  chatModel: InferenceChatModel;
  conversationEvents$: Observable<ConversationEvent[]>;
}) => {
  return conversationEvents$.pipe(
    switchMap((conversationEvents) => {
      return defer(async () =>
        generateConversationTitle({
          conversationEvents,
          chatModel,
        })
      ).pipe(shareReplay());
    })
  );
};

const getConversation$ = ({
  agentId,
  conversationId,
  conversationClient,
}: {
  agentId: string;
  conversationId: string | undefined;
  conversationClient: ConversationClient;
}) => {
  return defer(() => {
    if (conversationId) {
      return conversationClient.get({ conversationId });
    } else {
      return of(placeholderConversation({ agentId }));
    }
  }).pipe(shareReplay());
};

const placeholderConversation = ({ agentId }: { agentId: string }): Conversation => {
  return {
    id: uuidv4(),
    title: 'New conversation', // TODO: translate default
    agentId,
    events: [],
    lastUpdated: new Date().toISOString(),
    user: {
      id: 'unknown',
      name: 'unknown',
    },
  };
};

/**
 * Extract the new conversation events from the output of the agent.
 *
 * Emits only once with an array of event when the agent events observable completes.
 */
const extractNewConversationEvents$ = ({
  agentEvents$,
}: {
  agentEvents$: Observable<ChatEvent>;
}): Observable<ConversationEvent[]> => {
  return agentEvents$.pipe(
    filter((event): event is MessageEvent | ToolResultEvent => {
      return isMessageEvent(event) || isToolResultEvent(event);
    }),
    toArray(),
    mergeMap((newMessages) => {
      return of(
        newMessages.map((message) => {
          if (isMessageEvent(message)) {
            return message.message;
          } else {
            return createToolResult({
              toolCallId: message.toolResult.callId,
              toolResult: message.toolResult.result,
            });
          }
        })
      );
    }),
    shareReplay()
  );
};

/**
 * Persist a new conversation and emit the corresponding event
 */
const createConversation$ = ({
  agentId,
  conversationClient,
  title$,
  newConversationEvents$,
}: {
  agentId: string;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  newConversationEvents$: Observable<ConversationEvent[]>;
}) => {
  return forkJoin({
    title: title$,
    newConversationEvents: newConversationEvents$,
  }).pipe(
    switchMap(({ title, newConversationEvents }) => {
      return conversationClient.create({
        title,
        agentId,
        events: [...newConversationEvents],
      });
    }),
    switchMap((updatedConversation) => {
      return of(
        conversationCreatedEvent({
          title: updatedConversation.title,
          id: updatedConversation.id,
        })
      );
    })
  );
};

/**
 * Update an existing conversation and emit the corresponding event
 */
const updateConversation$ = ({
  conversationClient,
  conversation$,
  title$,
  newConversationEvents$,
}: {
  title$: Observable<string>;
  conversation$: Observable<Conversation>;
  newConversationEvents$: Observable<ConversationEvent[]>;
  conversationClient: ConversationClient;
}) => {
  return forkJoin({
    conversation: conversation$,
    title: title$,
    newConversationEvents: newConversationEvents$,
  }).pipe(
    switchMap(({ conversation, title, newConversationEvents }) => {
      return conversationClient.update(conversation.id, {
        title,
        events: [...conversation.events, ...newConversationEvents],
      });
    }),
    switchMap((updatedConversation) => {
      return of(
        conversationUpdatedEvent({
          title: updatedConversation.title,
          id: updatedConversation.id,
        })
      );
    })
  );
};
