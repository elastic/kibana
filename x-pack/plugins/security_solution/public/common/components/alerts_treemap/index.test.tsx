/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../mock';
import {
  mockAlertSearchResponse,
  mockNoDataAlertSearchResponse,
} from './lib/mocks/mock_alert_search_response';
import type { Props } from '.';
import { AlertsTreemap } from '.';

const defaultProps: Props = {
  data: mockAlertSearchResponse,
  maxBuckets: 1000,
  minChartHeight: 370,
  stackByField0: 'kibana.alert.rule.name',
  stackByField1: 'host.name',
};

describe('AlertsTreemap', () => {
  describe('when the response has data', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <AlertsTreemap {...defaultProps} />
        </TestProviders>
      );
    });

    test('it renders the treemap', () => {
      expect(screen.getByTestId('treemap').querySelector('.echChart')).toBeInTheDocument();
    });

    test('it renders the legend', () => {
      expect(screen.getByTestId('draggable-legend')).toBeInTheDocument();
    });
  });

  describe('when the response does NOT have data', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <AlertsTreemap {...defaultProps} data={mockNoDataAlertSearchResponse} />
        </TestProviders>
      );
    });

    test('it does NOT render the treemap', () => {
      expect(screen.queryByTestId('treemap')).not.toBeInTheDocument();
    });

    test('it does NOT render the legend', () => {
      expect(screen.queryByTestId('draggable-legend')).not.toBeInTheDocument();
    });

    test('it renders the "no data" message', () => {
      expect(screen.getByTestId('noDataLabel')).toHaveTextContent('No data to display');
    });
  });
});
