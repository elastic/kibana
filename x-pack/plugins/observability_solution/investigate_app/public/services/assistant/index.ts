/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createScreenContextAction,
  getWordsToReplaceUuidsList,
  Message,
  MessageRole,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { once } from 'lodash';
import { shareReplay, Subject } from 'rxjs';
import { InvestigateWidgetColumnSpan } from '@kbn/investigate-plugin/public';
import { InvestigateAppAPIClient } from '../../api';
import { ASSISTANT_RESPONSE_WIDGET_NAME } from '../../constants';
import type { InvestigateAppStartDependencies } from '../../types';
import { createAssistantResponseWidget } from '../../widgets/assistant_response_widget/create_assistant_response_widget';
import { createEmbeddableWidget } from '../../widgets/embeddable_widget/create_embeddable_widget';
import { createUserPromptWidget } from '../../widgets/user_prompt_widget/create_user_prompt_widget';
import { createAskStatusUpdate } from './create_ask_status_update';
import { getAllDatasets } from './get_all_datasets';
import { getRelevantExistingEmbeddables } from './get_relevant_existing_embeddables';
import { getStoredEmbeddables } from './get_stored_embeddables';
import { serializeTimelineForAssistant } from './serialize_timeline_for_assistant';
import { SYSTEM_MESSAGE } from './system_message';
import {
  AskChatFunction,
  AssistantService,
  TimelineAskStatusUpdateType,
  TimelineAskUpdate,
  TimelineAskUpdateType,
} from './types';

const MAX_EMBEDDABLES = 10;

export function createAssistantService({
  embeddable,
  contentManagement,
  observabilityAIAssistant,
  dataViews,
  datasetQuality,
  security,
  apiClient,
}: Pick<
  InvestigateAppStartDependencies,
  | 'observabilityAIAssistant'
  | 'embeddable'
  | 'contentManagement'
  | 'datasetQuality'
  | 'dataViews'
  | 'security'
> & { apiClient: InvestigateAppAPIClient }): AssistantService {
  const getChatClient = once(async (signal: AbortSignal) => {
    return {
      client: await observabilityAIAssistant.service.start({ signal }),
    };
  });

  const service: AssistantService = {
    ask: ({ prompt, timeline, signal, connectorId, start, end }) => {
      const askUpdates$ = new Subject<TimelineAskUpdate>();

      async function ask() {
        const [{ client }, user] = await Promise.all([
          getChatClient(signal),
          security.authc.getCurrentUser().then((retrievedUser) => {
            return {
              name: retrievedUser.username,
            };
          }),
        ]);

        const userPromptWidgetCreate = createUserPromptWidget({
          title: prompt,
          parameters: {
            prompt,
            user,
          },
        });

        askUpdates$.next({
          type: TimelineAskUpdateType.Widget,
          widget: {
            create: userPromptWidgetCreate,
          },
        });

        const chat: AskChatFunction = (name, options) => {
          return client.chat(name, {
            ...options,
            signal,
            connectorId,
          });
        };

        const wordIdList = await getWordsToReplaceUuidsList();

        const timelineItemsWithReplacedUuids = timeline.items.map((item) => {
          const word = wordIdList.take(item.id);

          return {
            ...item,
            id: word,
          };
        });

        const timelineContent = serializeTimelineForAssistant(timelineItemsWithReplacedUuids);

        askUpdates$.next(createAskStatusUpdate(TimelineAskStatusUpdateType.CollectingContext));

        const [_datasets, storedEmbeddables, _allDataViews] = await Promise.all([
          getAllDatasets({
            datasetQuality,
            signal,
          }),
          getStoredEmbeddables({
            embeddable,
            contentManagement,
          }),
          dataViews.getAllDataViewLazy(),
        ]);

        let relevantEmbeddables = storedEmbeddables;

        const context = timelineContent;

        if (relevantEmbeddables.length >= MAX_EMBEDDABLES) {
          askUpdates$.next(
            createAskStatusUpdate(TimelineAskStatusUpdateType.AnalyzingVisualizations)
          );

          relevantEmbeddables = await getRelevantExistingEmbeddables({
            storedEmbeddables,
            context,
            prompt,
            signal,
            chat,
            apiClient,
          });
        }

        const relevantEmbeddablesWithReplacedIds = relevantEmbeddables.map((relevantEmbeddable) => {
          const { id, ...rest } = relevantEmbeddable;
          return {
            ...rest,
            lookupId: wordIdList.take(relevantEmbeddable.id),
          };
        });

        const messages: Message[] = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: `${prompt}`,
            },
          },
        ];

        askUpdates$.next(createAskStatusUpdate(TimelineAskStatusUpdateType.GeneratingWidgets));

        const complete$ = client.complete({
          connectorId,
          signal,
          disableFunctions: {
            except: ['context'],
          },
          persist: false,
          responseLanguage: undefined,
          conversationId: undefined,
          instructions: [
            {
              system: true,
              doc_id: 'investigate_instructions',
              text: `${SYSTEM_MESSAGE}

              ## Current goal: generate new widgets
              
              You are now being asked to generate widgets. 
          
              - Add existing visualizations, using the "add_existing_visualizations" function.

              ### Adding multiple visualizations

              When adding multiple visualizations, do so in a SINGLE tool calls. Add multiple
              \`visualizations\`. This is faster for the user and ensures that visualizations
              end up in the same area of the grid if possible.

              ### Context
              
              Take the context previously mentioned in the system instructions into account.

              ### Time

              The current time is ${new Date().toISOString()}. The user is looking at the following
              time range:

              FROM ${start.toISOString()} TO ${end.toISOString()}
              
              ${context}

              ## Stored visualizations

              The following stored visualizations are available to display:

              ${relevantEmbeddablesWithReplacedIds
                .map((relevantEmbeddable) => {
                  return `### Title: ${relevantEmbeddable.title}

                ID: ${relevantEmbeddable.lookupId}
                Type: ${relevantEmbeddable.type}
                
                Description: ${relevantEmbeddable.description}
                `;
                })
                .join('\n\n')}
              `,
            },
          ],
          messages,
          getScreenContexts: () => [
            {
              actions: [
                createScreenContextAction(
                  {
                    name: 'add_existing_visualizations',
                    description: 'Adds one or more existing visualizations, by their IDs',
                    parameters: {
                      type: 'object',
                      properties: {
                        visualizations: {
                          type: 'array',
                          description: 'The visualizations to be added. Can be one or multiple.',
                          items: {
                            type: 'object',
                            properties: {
                              overrides: {
                                type: 'object',
                                description:
                                  'Overrides to the existing defaults, use only when necessary',
                                properties: {
                                  timeRangeStart: {
                                    type: 'string',
                                    description:
                                      'Override the start of the time range, in ISO timestamps',
                                  },
                                  timeRangeEnd: {
                                    type: 'string',
                                    description:
                                      'Override the start of the time range, in ISO timestamps',
                                  },
                                  title: {
                                    type: 'string',
                                    description:
                                      'A title for the visualization, if it needs to be different from the existing one',
                                  },
                                },
                              },
                              id: {
                                type: 'string',
                                description: 'The id of the existing visualization',
                              },
                              columns: {
                                type: 'number',
                                description: `Optionally define the amount of columns. The max is ${InvestigateWidgetColumnSpan.Four}. Use less columns for small widgets like single metrics and side-by-side comparisons`,
                              },
                            },
                            required: ['id'],
                          },
                        },
                      },
                      required: ['visualizations'],
                    } as const,
                  },
                  async ({ args }) => {
                    const { visualizations } = args;

                    const widgets = visualizations.map(({ id, overrides, columns }) => {
                      const storedEmbeddableId = wordIdList.lookup(id);

                      const storedEmbeddable = relevantEmbeddables.find(
                        (embeddableSavedObject) => embeddableSavedObject.id === storedEmbeddableId
                      );

                      if (!storedEmbeddable) {
                        throw new Error(`Visualization with ID ${id} does not exist`);
                      }

                      const config = storedEmbeddable.config;

                      const globalOverrides =
                        overrides?.timeRangeStart && overrides.timeRangeEnd
                          ? {
                              timeRange: {
                                from: overrides.timeRangeStart,
                                to: overrides.timeRangeEnd,
                              },
                            }
                          : undefined;

                      const widget = createEmbeddableWidget({
                        title: overrides?.title || storedEmbeddable.title,
                        description: storedEmbeddable.description,
                        parameters: {
                          type: storedEmbeddable.type,
                          config,
                          savedObjectId: storedEmbeddable.savedObjectId,
                          ...globalOverrides,
                        },
                        locked: !!globalOverrides,
                        columns,
                      });

                      return widget;
                    });

                    widgets.forEach((widget) => {
                      askUpdates$.next({
                        type: TimelineAskUpdateType.Widget,
                        widget: {
                          create: widget,
                        },
                      });
                    });

                    return {
                      content: {
                        message: `The following panels were added to the timeline: ${widgets
                          .map((widget) => widget.title)
                          .join(', ')}`,
                      },
                    };
                  }
                ),
                createScreenContextAction(
                  {
                    name: 'inspect_existing_visualization',
                    description: 'Request and inspect the attributes of an existing visualization',
                    parameters: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'The id of the existing visualization',
                        },
                      },
                      required: ['id'],
                    } as const,
                  },
                  async ({ args }) => {
                    const { id } = args;

                    const savedObjectId = wordIdList.lookup(id);

                    const savedObject = relevantEmbeddables.find(
                      (embeddableSavedObject) => embeddableSavedObject.id === savedObjectId
                    );

                    if (!savedObject) {
                      throw new Error(`Visualization with ID ${id} does not exist`);
                    }

                    return {
                      content: savedObject,
                    };
                  }
                ),
              ],
            },
          ],
        });

        await new Promise<void>((resolve, reject) => {
          complete$.subscribe({
            next: (event) => {
              if (
                event.type === StreamingChatResponseEventType.MessageAdd &&
                event.message.message.role === MessageRole.Assistant &&
                event.message.message.content
              ) {
                const assistantResponseWidgetCreate = createAssistantResponseWidget({
                  type: ASSISTANT_RESPONSE_WIDGET_NAME,
                  title: event.message.message.content,
                  parameters: {
                    content: event.message.message.content,
                  },
                });

                askUpdates$.next({
                  type: TimelineAskUpdateType.Widget,
                  widget: {
                    create: assistantResponseWidgetCreate,
                  },
                });
              }
            },
            error: (error) => {
              reject(error);
            },
            complete: () => {
              resolve();
            },
          });
        });
      }

      ask()
        .then(() => {
          askUpdates$.complete();
        })
        .catch((error) => {
          askUpdates$.error(error);
        });

      return askUpdates$.pipe(shareReplay());
    },
  };

  return service;
}
