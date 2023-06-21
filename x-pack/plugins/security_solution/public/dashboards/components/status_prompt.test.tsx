/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { DashboardViewPromptState } from '../hooks/use_dashboard_view_prompt_state';
import { StatusPrompt } from './status_prompt';

describe('StatusPrompt', () => {
  it('hides by default', () => {
    const { queryByTestId } = render(<StatusPrompt currentState={null} />);
    expect(queryByTestId(`dashboardViewEmptyDefault`)).not.toBeInTheDocument();
  });

  it('shows when No Read Permission', () => {
    const { queryByTestId } = render(
      <StatusPrompt currentState={DashboardViewPromptState.NoReadPermission} />
    );

    expect(
      queryByTestId(`dashboardViewEmpty${DashboardViewPromptState.NoReadPermission}`)
    ).toBeInTheDocument();
  });
});
