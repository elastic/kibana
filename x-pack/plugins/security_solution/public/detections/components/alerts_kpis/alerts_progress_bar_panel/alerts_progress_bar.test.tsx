/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsProgressBar } from './alerts_progress_bar';
import { parsedAlerts } from './mock_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by grouping', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
    stackByField: 'host.name',
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('progress bars renders correctly', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <AlertsProgressBar {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector(`[data-test-subj="alerts-progress-bar-title"]`)?.textContent
      ).toEqual(defaultProps.stackByField);
      expect(container.querySelector(`[data-test-subj="empty-proress-bar"]`)).toBeInTheDocument();
      expect(container.querySelector(`[data-test-subj="empty-proress-bar"]`)?.textContent).toEqual(
        'No items found'
      );
    });
  });

  test('progress bars renders correctly with data', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <AlertsProgressBar data={parsedAlerts} isLoading={false} stackByField={'host.name'} />
        </TestProviders>
      );
      expect(
        container.querySelector(`[data-test-subj="alerts-progress-bar-title"]`)?.textContent
      ).toEqual('host.name');
      expect(container.querySelector(`[data-test-subj="progress-bar"]`)).toBeInTheDocument();

      expect(
        container.querySelector(`[data-test-subj="empty-proress-bar"]`)
      ).not.toBeInTheDocument();

      parsedAlerts.forEach((alert, i) => {
        expect(
          container.querySelector(`[data-test-subj="progress-bar-${alert.key}"]`)
        ).toBeInTheDocument();
        expect(
          container.querySelector(`[data-test-subj="progress-bar-${alert.key}"]`)?.textContent
        ).toContain(parsedAlerts[i].label);
        expect(
          container.querySelector(`[data-test-subj="progress-bar-${alert.key}"]`)?.textContent
        ).toContain(parsedAlerts[i].percentage.toString());
      });
    });
  });
});
