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
import { AlertsData, AlertsField } from '../../../types';
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
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
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
    pageSizeOptions: [1, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: jest.fn().mockImplementation((props) => {
      return `${props.colIndex}:${props.rowIndex}`;
    }),
    showCheckboxes: false,
    trailingControlColumns: [],
    alerts,
    useFetchAlertsData,
    'data-test-subj': 'testTable',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('should show a flyout when selecting an alert', async () => {
    const wrapper = mountWithIntl(
      <AlertsTable
        {...{
          ...tableProps,
          pageSize: 10,
        }}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const openButton = wrapper.find('[data-test-subj="openFlyoutButton"]').first();
    openButton.simulate('click');

    // One tick to update state
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Another tick to ensure the lazy loaded component is rendered
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="alertsFlyout"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="alertsFlyoutTitle"]').first().text()).toBe('one');
    expect(wrapper.find('[data-test-subj="alertsFlyoutReason"]').first().text()).toBe('two');

    // Should paginate too
    wrapper.find('[data-test-subj="alertsFlyoutPaginateNext"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="alertsFlyoutTitle"]').first().text()).toBe('three');
    expect(wrapper.find('[data-test-subj="alertsFlyoutReason"]').first().text()).toBe('four');

    wrapper.find('[data-test-subj="alertsFlyoutPaginatePrevious"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="alertsFlyoutTitle"]').first().text()).toBe('one');
    expect(wrapper.find('[data-test-subj="alertsFlyoutReason"]').first().text()).toBe('two');
  });

  it('should refetch data if flyout pagination exceeds the current page', async () => {
    const wrapper = mountWithIntl(<AlertsTable {...tableProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const openButton = wrapper.find('[data-test-subj="openFlyoutButton"]').first();
    openButton.simulate('click');

    // One tick to update state
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Another tick to ensure the lazy loaded component is rendered
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    wrapper.find('[data-test-subj="alertsFlyoutPaginateNext"]').first().simulate('click');
    expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });

    wrapper.find('[data-test-subj="alertsFlyoutPaginatePrevious"]').first().simulate('click');
    expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 1 });
  });
});
