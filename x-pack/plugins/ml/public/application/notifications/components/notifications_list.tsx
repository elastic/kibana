/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  EuiSearchBarProps,
  SearchFilterConfig,
  IconColor,
} from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useRefresh } from '../../routing/use_refresh';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { MESSAGE_LEVEL, MessageLevel } from '../../../../common/constants/message_levels';
import { ListingPageUrlState } from '../../../../common/types/common';
import { usePageUrlState } from '../../util/url_state';
import { ML_PAGES } from '../../../../common/constants/locator';
import { NotificationsSearchResponse } from '../../../../common/types/notifications';
import { useMlKibana } from '../../contexts/kibana';

export type NotificationItem = NotificationsSearchResponse[number];

const levelBadgeMap: Record<MessageLevel, IconColor> = {
  error: 'danger',
  info: 'default',
  success: 'subdued',
  warning: 'warning',
};

export const getDefaultNotificationsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 50,
  sortField: 'timestamp',
  sortDirection: 'asc',
});

export const NotificationsList: FC = () => {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const [pageState, updatePageState] = usePageUrlState(
    ML_PAGES.NOTIFICATIONS,
    getDefaultNotificationsListState()
  );

  const { onTableChange, pagination, sorting } = useTableSettings<NotificationItem>(
    items,
    pageState,
    updatePageState
  );

  const refresh = useRefresh();

  const searchQueryText = pageState.queryText ?? '';

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await mlApiServices.notifications.findMessages({
        size: pagination.pageSize,
        sortField: sorting.sort.field,
        sortDirection: sorting.sort.direction,
      });
      setItems(response);
    } catch (e) {}

    setIsLoading(false);
  }, [pagination, sorting]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchNotifications();
    },
    [refresh]
  );

  useEffect(
    function updateOnF() {
      console.log(pagination, '___pagination___');
      console.log(sorting, '___sorting___');

      fetchNotifications();
    },
    [pagination, sorting]
  );

  const columns: Array<EuiBasicTableColumn<NotificationItem>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ml.notifications.timeLabel', {
        defaultMessage: 'Time',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlNotificationTime',
      width: '250px',
      render: (v: number) => dateFormatter(v),
    },
    {
      field: 'level',
      name: i18n.translate('xpack.ml.notifications.levelLabel', {
        defaultMessage: 'Level',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlNotificationLabel',
      render: (value: MessageLevel) => {
        return <EuiBadge color={levelBadgeMap[value]}>{value}</EuiBadge>;
      },
      width: '100px',
    },
    {
      field: 'job_type',
      name: i18n.translate('xpack.ml.notifications.typeLabel', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlNotificationType',
      render: (value: MessageLevel) => {
        return <EuiBadge color={'hollow'}>{value}</EuiBadge>;
      },
      width: '150px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ml.notifications.messageLabel', {
        defaultMessage: 'Message',
      }),
      sortable: false,
      truncateText: false,
      'data-test-subj': 'mlNotificationMessage',
    },
  ];

  const levelOptions = useMemo(() => {
    return Object.values(MESSAGE_LEVEL).map((v) => {
      return {
        value: v,
        name: v,
      };
    });
  }, []);

  const filters: SearchFilterConfig[] = [
    {
      type: 'field_value_selection',
      field: 'level',
      name: i18n.translate('xpack.ml.notifications.levelFilter', {
        defaultMessage: 'Level',
      }),
      multiSelect: 'or',
      options: levelOptions,
    },
  ];

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: (searchChange) => {
      if (searchChange.error !== null) {
        return false;
      }
      updatePageState({ queryText: searchChange.queryText, pageIndex: 0 });
      return true;
    },
    box: {
      incremental: true,
    },
    filters,
  };

  return (
    <EuiBasicTable<NotificationItem>
      allowNeutralSort={false}
      columns={columns}
      hasActions={true}
      isExpandable={false}
      isSelectable={false}
      items={items}
      itemId={'id'}
      loading={isLoading}
      search={search}
      rowProps={(item) => ({
        'data-test-subj': `mlModelsTableRow row-${item.id}`,
      })}
      pagination={pagination}
      onChange={onTableChange}
      sorting={sorting}
      data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
    />
  );
};
