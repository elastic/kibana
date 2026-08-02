/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { GenAiTab } from './genai_tab';
import type { GenAiFields } from './get_genai_fields';

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const baseFields: GenAiFields = {
  operationName: 'chat',
  requestModel: 'gpt-4o',
  provider: 'openai',
  inputTokens: 120,
  outputTokens: 45,
  requestParams: {},
  response: {},
  inputMessages: [],
  outputMessages: [],
};

function renderTab(fields: Partial<GenAiFields> = {}) {
  return render(
    <EuiThemeProvider>
      <GenAiTab genAi={{ ...baseFields, ...fields }} />
    </EuiThemeProvider>
  );
}

describe('GenAiTab', () => {
  it('renders operation, model, provider, and token pills', () => {
    renderTab();
    expect(screen.getByTestId('genAiPillOperationName')).toHaveTextContent('chat');
    expect(screen.getByTestId('genAiPillModel')).toHaveTextContent('gpt-4o');
    expect(screen.getByTestId('genAiPillProvider')).toHaveTextContent('openai');
    expect(screen.getByTestId('genAiPillInputTokens')).toHaveTextContent('120');
    expect(screen.getByTestId('genAiPillOutputTokens')).toHaveTextContent('45');
  });

  it('hides pills when values are absent', () => {
    renderTab({ operationName: undefined, provider: undefined, inputTokens: undefined });
    expect(screen.queryByTestId('genAiPillOperationName')).toBeNull();
    expect(screen.queryByTestId('genAiPillProvider')).toBeNull();
    expect(screen.queryByTestId('genAiPillInputTokens')).toBeNull();
    // model pill should still be present
    expect(screen.getByTestId('genAiPillModel')).toBeInTheDocument();
  });

  it('renders conversation section when messages are present', () => {
    const inputMessages = [{ role: 'user', content: 'Hello' }];
    const outputMessages = [{ role: 'assistant', content: 'Hi there' }];
    renderTab({ inputMessages, outputMessages });
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-1')).toBeInTheDocument();
  });

  it('does not render conversation section when no messages', () => {
    renderTab({ inputMessages: [], outputMessages: [], systemInstructions: undefined });
    expect(screen.queryByText('Conversation')).toBeNull();
  });

  it('renders system instructions as first message when present', () => {
    renderTab({ systemInstructions: 'You are a helpful assistant.' });
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    // The first comment is the system-instructions message
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
  });

  it('renders details section with response model', () => {
    renderTab({ responseModel: 'gpt-4o-2024-08-06' });
    expect(screen.getByTestId('genAiDetails')).toBeInTheDocument();
    expect(screen.getByText('Response model')).toBeInTheDocument();
  });

  it('renders request params when present', () => {
    renderTab({ requestParams: { temperature: 0.7, max_tokens: 2048 } });
    expect(screen.getByText('temperature')).toBeInTheDocument();
    expect(screen.getByText('max_tokens')).toBeInTheDocument();
  });

  it('renders all three accordion sections when data is present', () => {
    renderTab({
      responseModel: 'gpt-4o-2024-08-06',
      inputMessages: [{ role: 'user', content: 'Hello' }],
    });
    expect(screen.getByTestId('genAiSection-summary')).toBeInTheDocument();
    expect(screen.getByTestId('genAiSection-details')).toBeInTheDocument();
    expect(screen.getByTestId('genAiSection-conversation')).toBeInTheDocument();
  });

  it('omits Details and Conversation sections when their data is absent', () => {
    renderTab({ responseModel: undefined, requestParams: {}, response: {} });
    expect(screen.getByTestId('genAiSection-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('genAiSection-details')).toBeNull();
    expect(screen.queryByTestId('genAiSection-conversation')).toBeNull();
  });
});
