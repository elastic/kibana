/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { UserAgentSummaryItem } from './user_agent_summary_item';
import { renderWithTheme } from '../../../utils/test_helpers';

describe('UserAgentSummaryItem', () => {
  it('renders with basic props', () => {
    renderWithTheme(
      <div data-test-subj="user-agent-summary-item">
        <UserAgentSummaryItem name="Other" />
      </div>
    );

    const summary = screen.getByTestId('user-agent-summary-item');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent('Other');
  });

  it('renders with version', () => {
    renderWithTheme(
      <div data-test-subj="user-agent-summary-item">
        <UserAgentSummaryItem name="Other" version="1.0" />
      </div>
    );

    const summary = screen.getByTestId('user-agent-summary-item');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent('Other');
    expect(summary).toHaveTextContent('(1.0)');
  });
});
