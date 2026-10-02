/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';

import {
  AGENT_BUILDER_SESSION_TAG,
  PAGE_CONTEXT_ATTACHMENT_ID,
  buildPageContextAttachment,
  type PageContext,
} from './page_context';

/** The part of the chrome sidebar app API this plugin uses. */
export interface AgentBuilderSidebar {
  readonly isOpen: () => boolean;
  readonly isOpen$: () => Observable<boolean>;
}

export type PageContextAgentBuilder = Pick<
  AgentBuilderPluginStart,
  'setChatConfig' | 'clearChatConfig' | 'addAttachment' | 'removeAttachment'
>;

const useSidebarOpen = (sidebar: AgentBuilderSidebar | undefined): boolean => {
  const [open, setOpen] = useState(() => sidebar?.isOpen() ?? false);
  useEffect(() => {
    if (sidebar === undefined) return;
    const subscription = sidebar.isOpen$().subscribe(setOpen);
    return () => subscription.unsubscribe();
  }, [sidebar]);
  return open;
};

/**
 * Keeps the AI Agent informed about what the page shows and returns the attachment it sends.
 * While the sidebar is closed the attachment goes into the chat config used on the next open.
 * While it is open the attachment is upserted, because `setChatConfig` would replace the
 * sidebar props and drop queries the user has already staged.
 */
export const useAgentBuilderPageContext = ({
  agentBuilder,
  sidebar,
  context,
}: {
  agentBuilder: PageContextAgentBuilder | undefined;
  sidebar: AgentBuilderSidebar | undefined;
  context: PageContext | undefined;
}): AttachmentInput | undefined => {
  const open = useSidebarOpen(sidebar);
  const url = window.location.href;
  const attachment = useMemo(
    () => (context === undefined ? undefined : buildPageContextAttachment(context, url)),
    [context, url]
  );

  useEffect(() => {
    if (agentBuilder === undefined || attachment === undefined) return;
    if (open) {
      agentBuilder.addAttachment(attachment);
    } else {
      agentBuilder.setChatConfig({
        sessionTag: AGENT_BUILDER_SESSION_TAG,
        attachments: [attachment],
      });
    }
  }, [agentBuilder, attachment, open]);

  useEffect(() => {
    if (agentBuilder === undefined) return;
    return () => {
      agentBuilder.clearChatConfig();
      agentBuilder.removeAttachment(PAGE_CONTEXT_ATTACHMENT_ID);
    };
  }, [agentBuilder]);

  return attachment;
};
