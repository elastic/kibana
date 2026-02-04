/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { shouldfetchServer, ManagedTable, type TableActions, type ITableColumn } from '.';

jest.mock('../../../context/url_params_context/use_url_params', () => ({
  useLegacyUrlParams: () => ({
    urlParams: {},
  }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
    location: { search: '' },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {
        get: jest.fn().mockReturnValue('off'),
      },
    },
  }),
}));

interface TestItem {
  id: string;
  name: string;
}

const testColumns: Array<ITableColumn<TestItem>> = [
  { field: 'id', name: 'ID', sortable: true },
  { field: 'name', name: 'Name', sortable: true },
];

const testItems: TestItem[] = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
];

describe('ManagedTable', () => {
  describe('shouldfetchServer', () => {
    it('returns true if maxCountExceeded is true', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'apple',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if newSearchQuery does not include oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'grape',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeFalsy();
    });

    it('returns true if maxCountExceeded is true even if newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if maxCountExceeded is true and newSearchQuery is empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: '',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and both search queries are empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: '',
        oldSearchQuery: '',
      });
      expect(result).toBeFalsy();
    });
  });

  describe('Actions column', () => {
    const createTestActions = (onClickMock: jest.Mock): TableActions<TestItem> => [
      {
        id: 'alerts',
        groupLabel: 'Alerts',
        actions: [
          {
            id: 'createThresholdRule',
            name: 'Create threshold rule',
            items: [
              { id: 'createLatencyRule', name: 'Latency', onClick: onClickMock },
              { id: 'createErrorRateRule', name: 'Error rate', onClick: onClickMock },
            ],
          },
          { id: 'createAnomalyRule', name: 'Create anomaly rule', onClick: onClickMock },
        ],
      },
      {
        id: 'slos',
        groupLabel: 'SLOs',
        actions: [{ id: 'createLatencySlo', name: 'Create latency SLO', onClick: onClickMock }],
      },
    ];

    const renderManagedTable = (
      props: Partial<React.ComponentProps<typeof ManagedTable<TestItem>>> = {}
    ) => {
      const onClickMock = jest.fn();
      const actions = createTestActions(onClickMock);

      const result = render(
        <ManagedTable
          items={testItems}
          columns={testColumns}
          initialPageSize={10}
          actions={actions}
          {...props}
        />
      );

      return { ...result, onClickMock, actions };
    };

    it('renders actions column when actions are provided', () => {
      renderManagedTable();

      expect(screen.getByText('Actions')).toBeInTheDocument();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      expect(actionButtons).toHaveLength(testItems.length);
    });

    it('renders action groups with correct test subjects using IDs', async () => {
      renderManagedTable();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      expect(screen.getByTestId('apmManagedTableActionsMenuGroup-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('apmManagedTableActionsMenuGroup-slos')).toBeInTheDocument();
    });

    it('renders action items with correct test subjects using IDs', async () => {
      renderManagedTable();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      expect(
        screen.getByTestId('apmManagedTableActionsMenuItem-createThresholdRule')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('apmManagedTableActionsMenuItem-createAnomalyRule')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('apmManagedTableActionsMenuItem-createLatencySlo')
      ).toBeInTheDocument();
    });

    it('renders sub-menu items with correct test subjects using IDs', async () => {
      renderManagedTable();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      const thresholdRuleAction = screen.getByTestId(
        'apmManagedTableActionsMenuItem-createThresholdRule'
      );
      fireEvent.click(thresholdRuleAction);

      await waitFor(() => {
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createLatencyRule')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByTestId('apmManagedTableActionsMenuItem-createErrorRateRule')
      ).toBeInTheDocument();
    });

    it('calls onClick handler with correct item when action is clicked', async () => {
      const { onClickMock } = renderManagedTable();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      const anomalyRuleAction = screen.getByTestId(
        'apmManagedTableActionsMenuItem-createAnomalyRule'
      );
      fireEvent.click(anomalyRuleAction);

      expect(onClickMock).toHaveBeenCalledWith(testItems[0]);
    });

    it('calls onClick handler with correct item when sub-item is clicked', async () => {
      const { onClickMock } = renderManagedTable();

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[1]);

      const thresholdRuleAction = screen.getByTestId(
        'apmManagedTableActionsMenuItem-createThresholdRule'
      );
      fireEvent.click(thresholdRuleAction);

      await waitFor(() => {
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createLatencyRule')
        ).toBeInTheDocument();
      });

      const latencyRuleAction = screen.getByTestId(
        'apmManagedTableActionsMenuItem-createLatencyRule'
      );
      fireEvent.click(latencyRuleAction);

      expect(onClickMock).toHaveBeenCalledWith(testItems[1]);
    });

    it('does not render actions column when no actions are provided', () => {
      renderManagedTable({ actions: [] });

      expect(screen.queryByTestId('apmManagedTableActionsCellButton')).not.toBeInTheDocument();
    });

    it('disables action button when isActionsDisabled returns true', () => {
      renderManagedTable({ isActionsDisabled: (item) => item.id === '1' });

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');

      expect(actionButtons[0]).toBeDisabled();
      expect(actionButtons[1]).not.toBeDisabled();
    });
  });
});
