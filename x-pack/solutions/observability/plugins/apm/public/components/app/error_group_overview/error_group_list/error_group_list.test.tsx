/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { composeStories } from '@storybook/react';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import * as stories from './error_group_list.stories';

// Mock the usePerformanceContext hook
jest.mock('@kbn/ebt-tools/react', () => ({
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
  }),
}));

const { Example } = composeStories(stories);

describe('ErrorGroupList', () => {
  it('renders', () => {
    expect(() => render(<Example />)).not.toThrow();
  });

  it('does not describe the error message link with a tooltip repeating its own text', async () => {
    render(
      <EuiProvider>
        <Example />
      </EuiProvider>
    );

    const messageLink = await screen.findByRole('link', { name: 'net/http: abort Handler' });
    act(() => messageLink.focus());

    expect(await screen.findByRole('tooltip')).toHaveTextContent('net/http: abort Handler');
    expect(messageLink).not.toHaveAttribute('aria-describedby');
  });
});
