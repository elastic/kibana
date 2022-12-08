/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, fireEvent } from '@testing-library/react';
import React from 'react';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { TestProviders } from '../../../../common/mock';
import { AlertsSummaryChartsPanel } from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/query_toggle');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('AlertsChartsPanel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
  };

  const mockSetToggle = jest.fn();
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  beforeEach(() => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders correctly', async () => {
    await act(async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} />
        </TestProviders>
      );
      expect(container.querySelector('[data-test-subj="alerts-charts-panel"]')).toBeInTheDocument();
    });
  });

  test('it renders the header with the specified `alignHeader` alignment', async () => {
    await act(async () => {
      const { container } = render(
        <TestProviders>
          <AlertsSummaryChartsPanel {...defaultProps} alignHeader="flexEnd" />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="headerSectionInnerFlexGroup"]')?.classList[1]
      ).toContain('flexEnd');
    });
  });

  describe('Query', () => {
    test('it render with a illegal KQL', async () => {
      await act(async () => {
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
        expect(container.querySelector('[data-test-subj="severty-chart"]')).toBeInTheDocument();
      });
    });
  });

  describe('toggleQuery', () => {
    test('toggles', async () => {
      await act(async () => {
        const { container } = render(
          <TestProviders>
            <AlertsSummaryChartsPanel {...defaultProps} />
          </TestProviders>
        );
        const element = container.querySelector('[data-test-subj="query-toggle-header"]');
        if (element) {
          fireEvent.click(element);
        }
        expect(mockSetToggle).toBeCalledWith(false);
      });
    });

    test('toggleStatus=true, render', async () => {
      await act(async () => {
        const { container } = render(
          <TestProviders>
            <AlertsSummaryChartsPanel {...defaultProps} />
          </TestProviders>
        );
        expect(
          container.querySelector('[data-test-subj="alerts-charts-container"]')
        ).toBeInTheDocument();
      });
    });

    test('toggleStatus=false, hide', async () => {
      await act(async () => {
        mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
        const { container } = render(
          <TestProviders>
            <AlertsSummaryChartsPanel {...defaultProps} />
          </TestProviders>
        );
        expect(
          container.querySelector('[data-test-subj="alerts-charts-container"]')
        ).not.toBeInTheDocument();
      });
    });
  });
});
