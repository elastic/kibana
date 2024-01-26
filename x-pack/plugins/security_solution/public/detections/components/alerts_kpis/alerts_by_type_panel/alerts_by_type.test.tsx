/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsByType } from './alerts_by_type';
import { parsedAlerts } from './mock_type_data';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const display = 'alerts-by-type-palette-display';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
jest.mock('../../../../common/hooks/use_experimental_features');

describe('Alert by type chart', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAlertTypeEnabled flag is true', () => {
    beforeEach(() => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    });

    test('renders health and pallette display correctly without data', () => {
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType {...defaultProps} />
          </TestProviders>
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)).toBeInTheDocument();
        expect(container.querySelector(`[data-test-subj="${display}"]`)?.textContent).toContain(
          'Detection:0'
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)?.textContent).toContain(
          'Prevention:0'
        );
      });
    });

    test('renders table correctly without data', () => {
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType {...defaultProps} />
          </TestProviders>
        );
        expect(
          container.querySelector('[data-test-subj="alerts-by-type-table"]')
        ).toBeInTheDocument();
        expect(
          container.querySelector('[data-test-subj="alerts-by-type-table"] tbody')?.textContent
        ).toEqual('No items found');
      });
    });

    test('renders health and pallette display correctly with data', () => {
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType data={parsedAlerts} isLoading={false} />
          </TestProviders>
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)).toBeInTheDocument();
        expect(container.querySelector(`[data-test-subj="${display}"]`)?.textContent).toContain(
          'Detection:583'
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)?.textContent).toContain(
          'Prevention:6'
        );
      });
    });

    test('renders table correctly with data', () => {
      act(() => {
        const { queryAllByRole } = render(
          <TestProviders>
            <AlertsByType data={parsedAlerts} isLoading={false} />
          </TestProviders>
        );

        parsedAlerts.forEach((_, i) => {
          expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].rule);
          expect(queryAllByRole('row')[i + 1].textContent).toContain(parsedAlerts[i].type);
          expect(queryAllByRole('row')[i + 1].textContent).toContain(
            parsedAlerts[i].value.toString()
          );
        });
      });
    });
  });

  describe('isAlertTypeEnabled flag is false', () => {
    beforeEach(() => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    });

    test('do not renders health and pallette display correctly without data', () => {
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType {...defaultProps} />
          </TestProviders>
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)).not.toBeInTheDocument();
      });
    });

    test('renders table correctly without data', () => {
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType {...defaultProps} />
          </TestProviders>
        );
        expect(
          container.querySelector('[data-test-subj="alerts-by-type-table"]')
        ).toBeInTheDocument();
        expect(
          container.querySelector('[data-test-subj="alerts-by-type-table"] tbody')?.textContent
        ).toEqual('No items found');
      });
    });

    test('do not renders health and pallette display correctly with data', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      act(() => {
        const { container } = render(
          <TestProviders>
            <AlertsByType data={parsedAlerts} isLoading={false} />
          </TestProviders>
        );
        expect(container.querySelector(`[data-test-subj="${display}"]`)).not.toBeInTheDocument();
      });
    });

    test('renders table correctly with data', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      act(() => {
        const { queryAllByRole } = render(
          <TestProviders>
            <AlertsByType data={parsedAlerts} isLoading={false} />
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
});
