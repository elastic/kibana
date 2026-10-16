/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useEffect, useState } from 'react';
import { combineLatest, type Observable } from 'rxjs';

import { AGENT_BUILDER_SESSION_TAG, PAGE_CONTEXT_ATTACHMENT_ID } from './page_context';

/** The part of the chrome sidebar app API this plugin uses. */
export interface AgentBuilderSidebar {
  readonly isOpen: () => boolean;
  readonly isOpen$: () => Observable<boolean>;
}

export type StagerAgentBuilder = Pick<
  AgentBuilderPluginStart,
  'openChat' | 'setChatConfig' | 'clearChatConfig' | 'addAttachment' | 'removeAttachment'
> & {
  readonly events: { readonly ui: { readonly activeConversation$: Observable<unknown> } };
};

export interface AgentBuilderStager {
  /** Replaces the page context the AI Agent sees. */
  readonly setPageContext: (attachment: AttachmentInput) => void;
  /** Stages a query next to those already staged, opening the sidebar if needed. */
  readonly addQuery: (attachment: AttachmentInput) => void;
  readonly stop: () => void;
}

const upsert = (list: readonly AttachmentInput[], attachment: AttachmentInput) => [
  ...list.filter(({ id }) => id !== attachment.id),
  attachment,
];

/**
 * `addAttachment` is a silent no-op until the sidebar has mounted and registered its callbacks,
 * and `openChat` on a mounted sidebar replaces everything already staged. So attachments go
 * through `openChat` with the full list while the sidebar mounts, and through `addAttachment`
 * once it is ready. The sidebar is ready once it publishes its active conversation: that happens
 * in a child effect of the component whose own effect registers the callbacks, in the same commit.
 */
export const createAgentBuilderStager = ({
  agentBuilder,
  sidebar,
}: {
  agentBuilder: StagerAgentBuilder;
  sidebar: AgentBuilderSidebar;
}): AgentBuilderStager => {
  let pageContext: AttachmentInput | undefined;
  /** Queries staged since the sidebar started mounting; absent while closed or ready. */
  let mounting: AttachmentInput[] | undefined;
  let ready = false;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;

  const config = () => ({
    sessionTag: AGENT_BUILDER_SESSION_TAG,
    attachments: [...(pageContext === undefined ? [] : [pageContext]), ...(mounting ?? [])],
  });

  const subscription = combineLatest([
    sidebar.isOpen$(),
    agentBuilder.events.ui.activeConversation$,
  ]).subscribe(([open, activeConversation]) => {
    if (!open || activeConversation === null) {
      clearTimeout(readyTimer);
      readyTimer = undefined;
      ready = false;
      mounting = open ? mounting ?? [] : undefined;
      return;
    }
    if (ready || readyTimer !== undefined) return;
    readyTimer = setTimeout(() => {
      readyTimer = undefined;
      ready = true;
      mounting = undefined;
    }, 0);
  });

  return {
    setPageContext: (attachment) => {
      pageContext = attachment;
      if (!sidebar.isOpen()) {
        agentBuilder.setChatConfig(config());
      } else if (ready) {
        agentBuilder.addAttachment(attachment);
      } else {
        agentBuilder.openChat(config());
      }
    },
    addQuery: (attachment) => {
      if (ready && sidebar.isOpen()) {
        agentBuilder.addAttachment(attachment);
        return;
      }
      mounting = upsert(sidebar.isOpen() ? mounting ?? [] : [], attachment);
      agentBuilder.openChat(config());
    },
    stop: () => {
      subscription.unsubscribe();
      clearTimeout(readyTimer);
      agentBuilder.clearChatConfig();
      agentBuilder.removeAttachment(PAGE_CONTEXT_ATTACHMENT_ID);
    },
  };
};

/** Absent without Agent Builder; stopped when the app unmounts. */
export const useAgentBuilderStager = (
  agentBuilder: StagerAgentBuilder | undefined,
  sidebar: AgentBuilderSidebar | undefined
): AgentBuilderStager | undefined => {
  const [stager, setStager] = useState<AgentBuilderStager>();
  useEffect(() => {
    if (agentBuilder === undefined || sidebar === undefined) return;
    const created = createAgentBuilderStager({ agentBuilder, sidebar });
    setStager(created);
    return () => {
      created.stop();
      setStager(undefined);
    };
  }, [agentBuilder, sidebar]);
  return stager;
};
