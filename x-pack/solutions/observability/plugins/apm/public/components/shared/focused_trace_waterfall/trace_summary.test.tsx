/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TraceSummary } from './trace_summary';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';

const wrapper = ({ children }: PropsWithChildren<unknown>) => (
  <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
);

describe('TraceSummary', () => {
  it.each([
    {
      summary: { services: 0, traceEvents: 0, errors: 0 },
      expectedText: ['0 services', '0 trace events', '0 errors'],
    },
    {
      summary: { services: 1, traceEvents: 1, errors: 1 },
      expectedText: ['1 service', '1 trace event', '1 error'],
    },
    {
      summary: { services: 5, traceEvents: 10, errors: 3 },
      expectedText: ['5 services', '10 trace events', '3 errors'],
    },
  ])('renders correct pluralization for $summary', ({ summary, expectedText }) => {
    render(<TraceSummary summary={summary} />, { wrapper });
    for (const text of expectedText) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
