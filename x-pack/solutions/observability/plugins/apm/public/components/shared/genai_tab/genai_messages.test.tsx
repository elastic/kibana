/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { GenAiMessages } from './genai_messages';

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => (
    <div data-test-subj="markdownContent">{children}</div>
  ),
}));

function renderMessages(
  inputMessages: Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; content?: string; [key: string]: unknown }>;
  }>,
  outputMessages: Array<{ role: string; content?: string }> = [],
  systemInstructions?: string
) {
  return render(
    <EuiThemeProvider>
      <GenAiMessages
        inputMessages={inputMessages}
        outputMessages={outputMessages}
        systemInstructions={systemInstructions}
      />
    </EuiThemeProvider>
  );
}

describe('GenAiMessages', () => {
  it('renders one comment per message', () => {
    renderMessages([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '4' },
    ]);
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-1')).toBeInTheDocument();
  });

  it('renders system instructions as first message', () => {
    renderMessages([], [], 'You are a helpful coding assistant.');
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
  });

  it('renders text content via markdown for multiline/markdown content', () => {
    renderMessages([{ role: 'user', content: '# Hello\nWorld' }]);
    expect(screen.getByTestId('markdownContent')).toBeInTheDocument();
    expect(screen.getByTestId('markdownContent').textContent).toContain('# Hello');
  });

  it('renders function/tool part as a JSON code block', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'function', name: 'get_weather', args: { location: 'Paris' } }],
      },
    ]);
    // GenAiFieldValue detects object and renders EuiCodeBlock — look for code element
    const codeBlocks = document.querySelectorAll('code, pre, [class*="CodeBlock"]');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });

  it('renders output messages after input messages', () => {
    renderMessages([{ role: 'user', content: 'Hello' }], [{ role: 'assistant', content: 'Hi' }]);
    const messages = screen.getAllByTestId(/genAiMessage-/);
    expect(messages).toHaveLength(2);
  });

  it('returns null when there are no messages', () => {
    const { container } = renderMessages([], [], undefined);
    expect(container.firstChild).toBeNull();
  });

  it('shows View more toggle for very long content (> 1000 chars)', () => {
    // MaybeViewMore threshold: Math.ceil(content.length / 60) * 18 > 300
    // Need content.length > 60 * 300/18 ≈ 1000 chars
    const longContent = 'a'.repeat(1200);
    renderMessages([{ role: 'user', content: longContent }]);
    expect(screen.getByText('View more')).toBeInTheDocument();
  });

  it('toggles to View less when View more is clicked', () => {
    const longContent = 'a'.repeat(1200);
    renderMessages([{ role: 'user', content: longContent }]);
    const toggle = screen.getByText('View more');
    fireEvent.click(toggle);
    expect(screen.getByText('View less')).toBeInTheDocument();
  });
});
