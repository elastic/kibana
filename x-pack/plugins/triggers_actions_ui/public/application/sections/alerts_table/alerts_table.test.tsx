/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsTable } from './alerts_table';
import { AlertsData } from '../../../types';
import { PLUGIN_ID } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('../../../../../../../src/plugins/data/public/');
jest.mock('../../../common/lib/kibana');

const columns = [
  {
    id: 'kibana.alert.rule.name',
    displayAsText: 'Name',
  },
  {
    id: 'kibana.alert.rule.category',
    displayAsText: 'Category',
  },
];

const hookUseKibanaMock = useKibana as jest.Mock;
const alertsTableConfigurationRegistryMock =
  hookUseKibanaMock().services.alertsTableConfigurationRegistry;
alertsTableConfigurationRegistryMock.has.mockImplementation((plugin: string) => {
  return plugin === PLUGIN_ID;
});
alertsTableConfigurationRegistryMock.get.mockImplementation((plugin: string) => {
  if (plugin === PLUGIN_ID) {
    return { columns };
  }
  return {};
});

describe('AlertsTable', () => {
  const consumers = [
    AlertConsumers.APM,
    AlertConsumers.LOGS,
    AlertConsumers.UPTIME,
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.SIEM,
  ];

  const alerts: AlertsData[] = [
    {
      field1: ['one'],
      field2: ['two'],
    },
    {
      field1: ['three'],
      field2: ['four'],
    },
  ];

  const fetchAlertsData = {
    activePage: 0,
    alerts,
    alertsCount: alerts.length,
    isInitializing: false,
    isLoading: false,
    getInspectQuery: jest.fn().mockImplementation(() => ({ request: {}, response: {} })),
    onColumnsChange: jest.fn(),
    onPageChange: jest.fn(),
    onSortChange: jest.fn(),
    refresh: jest.fn(),
  };

  const useFetchAlertsData = () => {
    return fetchAlertsData;
  };

  const tableProps = {
    ownerPluginId: PLUGIN_ID,
    consumers,
    bulkActions: [],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 1,
    pageSizeOptions: [1, 2, 5, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: jest.fn().mockImplementation((props) => {
      return `${props.colIndex}:${props.rowIndex}`;
    }),
    showCheckboxes: false,
    trailingControlColumns: [],
    useFetchAlertsData,
    'data-test-subj': 'testTable',
  };

  beforeEach(() => {
    alertsTableConfigurationRegistryMock.get.mockClear();
    alertsTableConfigurationRegistryMock.has.mockClear();
  });

  describe('Alerts table UI', () => {
    it('should support sorting', async () => {
      const wrapper = mountWithIntl(<AlertsTable {...tableProps} />);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      wrapper.find('.euiDataGridHeaderCell__button').first().simulate('click');
      wrapper.update();
      wrapper
        .find(`[data-test-subj="dataGridHeaderCellActionGroup-${columns[0].id}"]`)
        .first()
        .simulate('click');
      wrapper.find(`.euiListGroupItem__label[title="Sort A-Z"]`).simulate('click');
      expect(fetchAlertsData.onSortChange).toHaveBeenCalledWith([
        { direction: 'asc', id: 'kibana.alert.rule.name' },
      ]);
    });

    it('should support pagination', async () => {
      const renderResult = render(<AlertsTable {...tableProps} />);
      userEvent.click(renderResult.getByTestId('pagination-button-1'));
      expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
    });
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the regsitry', async () => {
      render(<AlertsTable {...tableProps} />);
      expect(alertsTableConfigurationRegistryMock.has).toHaveBeenCalledWith(PLUGIN_ID);
      expect(alertsTableConfigurationRegistryMock.get).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should fail to render when the plugin id owner is not registered', async () => {
      const props = { ...tableProps, ownerPluginId: 'none' };
      expect(() => {
        render(<AlertsTable {...props} />);
      }).toThrow(
        'This plugin has no registered its alerts table parameters inside TriggersActionsUi'
      );
    });
  });
});
