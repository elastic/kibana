/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { useKibana } from '../../../utils/kibana_react';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import { ErrorBudgetHeader } from './error_budget_header';

jest.mock('../../../utils/kibana_react');
const useKibanaMock = useKibana as jest.Mock;

describe('In Observability Context', () => {
  it('renders Error Budget Actions button on mouse over', async () => {
    useKibanaMock.mockReturnValue({
      services: {
        executionContext: {
          get: () => ({
            name: 'observability-overview',
          }),
        },
      },
    });
    const slo = buildSlo();

    render(<ErrorBudgetHeader isMouseOver={true} slo={slo} />);
    expect(screen.queryByTestId('o11yErrorBudgetActionsButton')).toBeTruthy();
  });
});

describe('In Dashboard Context', () => {
  it('does not render Error budget Actions button on mouse over', async () => {
    useKibanaMock.mockReturnValue({
      services: {
        executionContext: {
          get: () => ({
            name: 'dashboards',
          }),
        },
      },
    });
    const slo = buildSlo();

    render(<ErrorBudgetHeader isMouseOver={true} slo={slo} />);

    expect(screen.queryByTestId('o11yErrorBudgetActionsButton')).toBeFalsy();
  });
});
