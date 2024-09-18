/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsSummaryChartsPanel } from '.';
import type { GroupBySelection } from '../alerts_progress_bar_panel/types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/query_toggle');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('AlertsSummaryChartsPanel', () => {
  const mockSetIsExpanded = jest.fn();
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    isExpanded: true,
    setIsExpanded: mockSetIsExpanded,
    groupBySelection: 'host.name' as GroupBySelection,
    setGroupBySelection: jest.fn(),
  };

  test('renders correctly', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsSummaryChartsPanel {...defaultProps} />
      </TestProviders>
    );
    expect(screen.queryByTestId('alerts-charts-panel')).toBeInTheDocument();
  });

  test('it renders the header with the specified `alignHeader` alignment', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsSummaryChartsPanel {...defaultProps} alignHeader="flexEnd" />
      </TestProviders>
    );
    expect(
      container.querySelector('[data-test-subj="headerSectionInnerFlexGroup"]')?.classList[1]
    ).toContain('flexEnd');
  });

  describe('Query', () => {
    test('it render with a illegal KQL', async () => {
      jest.mock('@kbn/es-query', () => ({
        buildEsQuery: jest.fn().mockImplementation(() => {
          throw new Error('Something went wrong');
        }),
      }));
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(
          container.querySelector('[data-test-subj="alerts-charts-panel"]')
        ).toBeInTheDocument();
      });
    });
  });

  describe('toggleQuery', () => {
    test('toggles', async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} />
        </TestProviders>
      );
      const element = container.querySelector('[data-test-subj="query-toggle-header"]');
      if (element) {
        fireEvent.click(element);
      }
      expect(mockSetIsExpanded).toBeCalledWith(false);
    });

    it('when isExpanded is true, render summary chart', async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-charts-container"]')
      ).toBeInTheDocument();
    });

    it('when isExpanded is false, hide summary chart', async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} isExpanded={false} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-charts-container"]')
      ).not.toBeInTheDocument();
    });
  });
});
