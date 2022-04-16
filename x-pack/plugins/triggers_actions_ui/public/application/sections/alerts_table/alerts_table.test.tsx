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
jest.mock('@kbn/data-plugin/public');
jest.mock('../../../common/lib/kibana');

describe('AlertsTable', () => {
  const consumers = [
    AlertConsumers.APM,
    AlertConsumers.LOGS,
    AlertConsumers.UPTIME,
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.SIEM,
  ];
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
    consumers,
    bulkActions: [],
    columns,
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
    const wrapper = mountWithIntl(<AlertsTable {...tableProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('.euiPagination__item EuiButtonEmpty').at(1).simulate('click');
    expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
  });
});
