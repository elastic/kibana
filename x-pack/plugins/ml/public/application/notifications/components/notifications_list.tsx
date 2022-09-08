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
  IconColor,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
} from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import useDebounce from 'react-use/lib/useDebounce';
import { useToastNotificationService } from '../../services/toast_notification_service';
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
  const { displayErrorToast } = useToastNotificationService();

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
      setIsLoading(true);
      const response = await mlApiServices.notifications.findMessages({
        size: pagination.pageSize,
        sortField: sorting.sort!.field,
        sortDirection: sorting.sort!.direction,
        queryString: searchQueryText,
      });
      setItems(response);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.notifications.fetchFailedError', {
          defaultMessage: 'Fetch notifications failed',
        })
      );
    }

    setIsLoading(false);
  }, [pagination, sorting, searchQueryText]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchNotifications();
    },
    [refresh]
  );

  useDebounce(
    function updateOnF() {
      fetchNotifications();
    },
    500,
    [pagination, sorting, searchQueryText]
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

  // @ts-ignore
  const levelOptions = useMemo(() => {
    return Object.values(MESSAGE_LEVEL).map((v) => {
      return {
        value: v,
        name: v,
      };
    });
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            placeholder={i18n.translate('xpack.ml.notifications.searchPlaceholder', {
              defaultMessage: 'Search by message...',
            })}
            value={searchQueryText}
            onChange={(e) => {
              updatePageState({ queryText: e.target.value });
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size={'m'} />
      <EuiBasicTable<NotificationItem>
        columns={columns}
        hasActions={true}
        isExpandable={false}
        isSelectable={false}
        items={items}
        itemId={'id'}
        loading={isLoading}
        rowProps={(item) => ({
          'data-test-subj': `mlModelsTableRow row-${item.id}`,
        })}
        pagination={pagination}
        onChange={onTableChange}
        sorting={sorting}
        data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
      />
    </>
  );
};
