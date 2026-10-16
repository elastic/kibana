/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { BehaviorSubject } from 'rxjs';

import { createAgentBuilderStager } from './agent_builder_stager';
import { AGENT_BUILDER_SESSION_TAG, PAGE_CONTEXT_ATTACHMENT_ID } from './page_context';

const page = (content: string): AttachmentInput => ({
  id: PAGE_CONTEXT_ATTACHMENT_ID,
  type: 'text',
  hidden: true,
  data: { content },
});

const query = (id: string): AttachmentInput => ({
  id,
  type: 'esql',
  data: { query: `FROM ${id}` },
});

/** A sidebar that opens when `openChat` is called and mounts when `mount` is called. */
const setup = ({ open = false, mounted = false } = {}) => {
  const open$ = new BehaviorSubject(open);
  const activeConversation$ = new BehaviorSubject<unknown>(mounted ? { id: undefined } : null);
  const agentBuilder = {
    openChat: jest.fn(() => {
      open$.next(true);
      return { chatRef: { close: jest.fn() } };
    }),
    setChatConfig: jest.fn(),
    clearChatConfig: jest.fn(),
    addAttachment: jest.fn(),
    removeAttachment: jest.fn(),
    events: { ui: { activeConversation$ } },
  };
  const stager = createAgentBuilderStager({
    agentBuilder,
    sidebar: { isOpen: () => open$.getValue(), isOpen$: () => open$.asObservable() },
  });
  const mount = () => {
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();
  };
  const close = () => {
    open$.next(false);
    activeConversation$.next(null);
  };
  return { agentBuilder, stager, mount, close };
};

describe('createAgentBuilderStager', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('puts the page context in the chat config while the sidebar is closed', () => {
    const { agentBuilder, stager } = setup();
    stager.setPageContext(page('catalog'));

    expect(agentBuilder.setChatConfig).toHaveBeenCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [page('catalog')],
    });
    expect(agentBuilder.openChat).not.toHaveBeenCalled();
  });

  it('opens a closed sidebar with the page context and the query', () => {
    const { agentBuilder, stager } = setup();
    stager.setPageContext(page('catalog'));
    stager.addQuery(query('a'));

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [page('catalog'), query('a')],
    });
  });

  it('keeps every query added while the sidebar mounts', () => {
    const { agentBuilder, stager, mount } = setup();
    stager.setPageContext(page('catalog'));
    stager.addQuery(query('a'));
    stager.addQuery(query('b'));
    stager.addQuery(query('a'));
    stager.setPageContext(page('flyout'));

    expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    expect(agentBuilder.openChat).toHaveBeenLastCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [page('flyout'), query('b'), query('a')],
    });

    mount();
    stager.addQuery(query('c'));

    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(query('c'));
    expect(agentBuilder.openChat).toHaveBeenCalledTimes(4);
  });

  it('waits for the effect after the mount before using addAttachment', () => {
    const { agentBuilder, stager } = setup({ open: true });
    agentBuilder.events.ui.activeConversation$.next({ id: undefined });
    stager.addQuery(query('a'));

    expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();
    stager.addQuery(query('b'));

    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(query('b'));
  });

  it('upserts into a ready sidebar without replacing what is staged', () => {
    const { agentBuilder, stager } = setup({ open: true, mounted: true });
    jest.runOnlyPendingTimers();
    stager.setPageContext(page('catalog'));
    stager.addQuery(query('a'));

    expect(agentBuilder.addAttachment.mock.calls).toEqual([[page('catalog')], [query('a')]]);
    expect(agentBuilder.openChat).not.toHaveBeenCalled();
    expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
  });

  it('stays ready when the active conversation changes', () => {
    const { agentBuilder, stager } = setup({ open: true, mounted: true });
    jest.runOnlyPendingTimers();
    agentBuilder.events.ui.activeConversation$.next({ id: 'conversation-1' });
    stager.addQuery(query('a'));

    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(query('a'));
  });

  it('forgets the queries staged before the sidebar closed', () => {
    const { agentBuilder, stager, close } = setup();
    stager.addQuery(query('a'));
    close();
    stager.addQuery(query('b'));

    expect(agentBuilder.openChat).toHaveBeenLastCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [query('b')],
    });
  });

  it('clears the chat config and removes the page context when stopped', () => {
    const { agentBuilder, stager } = setup({ open: true, mounted: true });
    stager.stop();

    expect(agentBuilder.clearChatConfig).toHaveBeenCalledTimes(1);
    expect(agentBuilder.removeAttachment).toHaveBeenCalledWith(PAGE_CONTEXT_ATTACHMENT_ID);
  });
});
