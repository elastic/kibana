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
import { parsedAlerts } from './mock_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by type chart', () => {
  const defaultProps = {
    items: [],
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders health and pallette display correctly without data', () => {
    act(() => {
      const { container } = render(
        <TestProviders>
          <AlertsByType {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')?.textContent
      ).toContain('Detection:0');
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')?.textContent
      ).toContain('Prevention:0');
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
          <AlertsByType items={parsedAlerts} isLoading={false} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')?.textContent
      ).toContain('Detection:583');
      expect(
        container.querySelector('[data-test-subj="alerts-by-type-palette-display"]')?.textContent
      ).toContain('Prevention:6');
    });
  });

  test('renders table correctly with data', () => {
    act(() => {
      const { queryAllByRole } = render(
        <TestProviders>
          <AlertsByType items={parsedAlerts} isLoading={false} />
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
