/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { SeverityLevelChart } from './severity_level_chart';
import { parsedAlerts } from './mock_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Severity level chart', () => {
  const defaultProps = {
    items: [],
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders severity table correctly', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <SeverityLevelChart {...defaultProps} />
        </TestProviders>
      );
      expect(container.querySelector('[data-test-subj="severity-level-table"')).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="severity-level-table"] tbody')?.textContent
      ).toEqual('No items found');
    });
  });

  test('renders severity donut correctly', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <SeverityLevelChart {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="severity-level-donut"]')
      ).toBeInTheDocument();
    });
  });

  test('renders table correctly with data', () => {
    act(() => {
      const { queryAllByRole, container } = render(
        <TestProviders>
          <SeverityLevelChart items={parsedAlerts} isLoading={false} />
        </TestProviders>
      );
      expect(container.querySelector('[data-test-subj="severity-level-table"')).toBeInTheDocument();
      parsedAlerts.forEach((_, i) => {
        expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].label);
        expect(queryAllByRole('row')[i + 1].textContent).toContain(
          parsedAlerts[i].value.toString()
        );
      });
    });
  });
});
