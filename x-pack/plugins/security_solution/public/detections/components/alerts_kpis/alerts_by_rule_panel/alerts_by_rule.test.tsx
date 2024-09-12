/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsByRule } from './alerts_by_rule';
import { parsedAlerts } from './mock_rule_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by rule chart', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders table correctly without data', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <AlertsByRule {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-by-rule-table"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="alerts-by-rule-table"] tbody')?.textContent
      ).toEqual('No items found');
    });
  });

  test('renders table correctly with data', () => {
    act(() => {
      const { queryAllByRole } = render(
        <TestProviders>
          <AlertsByRule data={parsedAlerts} isLoading={false} />
        </TestProviders>
      );

      parsedAlerts.forEach((_, i) => {
        expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].rule);
        expect(queryAllByRole('row')[i + 1].textContent).toContain(
          parsedAlerts[i].value.toString()
        );
      });
    });
  });
});
