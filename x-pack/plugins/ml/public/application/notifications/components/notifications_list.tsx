/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IconColor, Query, SearchFilterConfig } from '@elastic/eui';
import { EuiBadge, EuiCallOut, EuiBasicTable, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import useDebounce from 'react-use/lib/useDebounce';
import useMount from 'react-use/lib/useMount';
import { usePageUrlState } from '@kbn/ml-url-state';
import { useTimefilter, useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { EntityFilter } from './entity_filter';
import { useMlNotifications } from '../../contexts/ml/ml_notifications_context';
import { ML_NOTIFICATIONS_MESSAGE_LEVEL } from '../../../../common/constants/notifications';
import { SavedObjectsWarning } from '../../components/saved_objects_warning';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useRefresh } from '../../routing/use_refresh';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import type { ListingPageUrlState } from '../../../../common/types/common';
import { ML_PAGES } from '../../../../common/constants/locator';
import type {
  MlNotificationMessageLevel,
  NotificationItem,
} from '../../../../common/types/notifications';
import { useMlKibana } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml';

const levelBadgeMap: Record<MlNotificationMessageLevel, IconColor> = {
  [ML_NOTIFICATIONS_MESSAGE_LEVEL.ERROR]: 'danger',
  [ML_NOTIFICATIONS_MESSAGE_LEVEL.WARNING]: 'warning',
  [ML_NOTIFICATIONS_MESSAGE_LEVEL.INFO]: 'default',
};

interface PageUrlState {
  pageKey: typeof ML_PAGES.NOTIFICATIONS;
  pageUrlState: ListingPageUrlState;
}

export const getDefaultNotificationsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 25,
  sortField: 'timestamp',
  sortDirection: 'desc',
});

export const NotificationsList: FC = () => {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();

  const { displayErrorToast } = useToastNotificationService();

  const { lastCheckedAt, setLastCheckedAt, notificationsCounts, latestRequestedAt } =
    useMlNotifications();
  const timeFilter = useTimefilter();
  const timeRange = useTimeRangeUpdates();

  useMount(function setTimeRangeOnMount() {
    if (latestRequestedAt !== null) {
      timeFilter.setTime({
        from: moment(latestRequestedAt).toISOString(),
        to: 'now',
      });
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [queryError, setQueryError] = useState<string>('');

  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const [pageState, updatePageState] = usePageUrlState<PageUrlState>(
    ML_PAGES.NOTIFICATIONS,
    getDefaultNotificationsListState()
  );

  const { onTableChange, pagination, sorting } = useTableSettings<NotificationItem>(
    totalCount,
    pageState,
    updatePageState
  );

  const refresh = useRefresh();

  const searchQueryText = pageState.queryText;

  const queryInstance = useMemo<Query | undefined>(() => {
    try {
      setQueryError('');
      return EuiSearchBar.Query.parse(searchQueryText ?? '');
    } catch (error) {
      setQueryError(error.message);
    }
  }, [searchQueryText, setQueryError]);

  const fetchNotifications = useCallback(async () => {
    if (!queryInstance) return;

    const queryString = EuiSearchBar.Query.toESQueryString(queryInstance);

    try {
      setIsLoading(true);
      const response = await mlApiServices.notifications.findMessages({
        sortField: sorting.sort!.field,
        sortDirection: sorting.sort!.direction,
        earliest: timeRange.from,
        latest: timeRange.to,
        queryString,
      });
      setItems(response.results);
      setTotalCount(response.total);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.notifications.fetchFailedError', {
          defaultMessage: 'Error loading list of notifications',
        })
      );
    }

    setIsLoading(false);
  }, [sorting, queryInstance, mlApiServices.notifications, displayErrorToast, timeRange]);

  useEffect(
    function updateLastCheckedAt() {
      // Resolve the latest timestamp on the current page
      const pageItemIndex = pagination.pageIndex * pagination.pageSize;
      const currentPageItems = items.slice(pageItemIndex, pageItemIndex + pagination.pageSize);
      const latestTimestamp = Math.max(
        ...currentPageItems.map((v) => v.timestamp),
        lastCheckedAt ?? 0
      );
      if (latestTimestamp !== lastCheckedAt && latestTimestamp !== 0) {
        setLastCheckedAt(latestTimestamp);
      }
    },
    [lastCheckedAt, setLastCheckedAt, items, pagination.pageIndex, pagination.pageSize]
  );

  useDebounce(
    function refetchNotification() {
      fetchNotifications();
    },
    500,
    [sorting, queryInstance, refresh]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<NotificationItem>>>(() => {
    return [
      {
        id: 'timestamp',
        field: 'timestamp',
        name: <FormattedMessage id="xpack.ml.notifications.timeLabel" defaultMessage="Time" />,
        sortable: true,
        truncateText: false,
        'data-test-subj': 'mlNotificationTime',
        width: '250px',
        render: (v: number) => dateFormatter(v),
      },
      {
        field: 'level',
        name: <FormattedMessage id="xpack.ml.notifications.levelLabel" defaultMessage="Level" />,
        sortable: true,
        truncateText: false,
        'data-test-subj': 'mlNotificationLevel',
        render: (value: MlNotificationMessageLevel) => {
          return <EuiBadge color={levelBadgeMap[value]}>{value}</EuiBadge>;
        },
        width: '100px',
      },
      {
        field: 'job_type',
        name: <FormattedMessage id="xpack.ml.notifications.typeLabel" defaultMessage="Type" />,
        sortable: true,
        truncateText: false,
        'data-test-subj': 'mlNotificationType',
        render: (value: string) => {
          return <EuiBadge color={'hollow'}>{value}</EuiBadge>;
        },
        width: '200px',
      },
      {
        field: 'job_id',
        name: (
          <FormattedMessage id="xpack.ml.notifications.entityLabel" defaultMessage="Entity ID" />
        ),
        sortable: true,
        truncateText: false,
        'data-test-subj': 'mlNotificationEntity',
        width: '200px',
      },
      {
        field: 'message',
        name: (
          <FormattedMessage id="xpack.ml.notifications.messageLabel" defaultMessage="Message" />
        ),
        sortable: false,
        truncateText: false,
        'data-test-subj': 'mlNotificationMessage',
      },
    ];
  }, [dateFormatter]);

  const filters: SearchFilterConfig[] = useMemo<SearchFilterConfig[]>(() => {
    const jobTypeOptions = [];
    if (isADEnabled === true) {
      jobTypeOptions.push({
        value: 'anomaly_detector',
        name: i18n.translate('xpack.ml.notifications.filters.type.anomalyDetector', {
          defaultMessage: 'Anomaly Detection',
        }),
      });
    }
    if (isDFAEnabled === true) {
      jobTypeOptions.push({
        value: 'data_frame_analytics',
        name: i18n.translate('xpack.ml.notifications.filters.type.dfa', {
          defaultMessage: 'Data Frame Analytics',
        }),
      });
    }
    if (isNLPEnabled === true || isDFAEnabled === true) {
      jobTypeOptions.push({
        value: 'inference',
        name: i18n.translate('xpack.ml.notifications.filters.type.inference', {
          defaultMessage: 'Inference',
        }),
      });
    }

    jobTypeOptions.push({
      value: 'system',
      name: i18n.translate('xpack.ml.notifications.filters.type.system', {
        defaultMessage: 'System',
      }),
    });

    return [
      {
        type: 'field_value_selection',
        field: 'level',
        name: i18n.translate('xpack.ml.notifications.filters.level.name', {
          defaultMessage: 'Level',
        }),
        multiSelect: 'or',
        options: [
          {
            value: ML_NOTIFICATIONS_MESSAGE_LEVEL.ERROR,
            name: i18n.translate('xpack.ml.notifications.filters.level.error', {
              defaultMessage: 'Error',
            }),
            field: 'level',
          },
          {
            value: ML_NOTIFICATIONS_MESSAGE_LEVEL.WARNING,
            name: i18n.translate('xpack.ml.notifications.filters.level.warning', {
              defaultMessage: 'Warning',
            }),
            field: 'level',
          },
          {
            value: ML_NOTIFICATIONS_MESSAGE_LEVEL.INFO,
            name: i18n.translate('xpack.ml.notifications.filters.level.info', {
              defaultMessage: 'Info',
            }),
            field: 'level',
          },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'job_type',
        name: i18n.translate('xpack.ml.notifications.filters.level.type', {
          defaultMessage: 'Type',
        }),
        multiSelect: 'or',
        options: jobTypeOptions,
      },
      {
        type: 'custom_component',
        component: EntityFilter,
      },
    ];
  }, [isADEnabled, isDFAEnabled, isNLPEnabled]);

  const newNotificationsCount = Object.values(notificationsCounts).reduce((a, b) => a + b);

  const itemsPerPage = useMemo(() => {
    const fromIndex = pagination.pageIndex * pagination.pageSize;
    const toIndex = fromIndex + pagination.pageSize;
    return items.slice(fromIndex, toIndex);
  }, [items, pagination]);

  return (
    <>
      <SavedObjectsWarning onCloseFlyout={fetchNotifications} forceRefresh={isLoading} />

      {newNotificationsCount && !isLoading ? (
        <>
          <EuiCallOut
            size="s"
            title={
              <FormattedMessage
                id="xpack.ml.notifications.newNotificationsMessage"
                defaultMessage="There {newNotificationsCount, plural, one {is # notification} other {are # notifications}} since {sinceDate}. Refresh the page to view updates."
                values={{ sinceDate: dateFormatter(latestRequestedAt), newNotificationsCount }}
              />
            }
            iconType="bell"
          />
          <EuiSpacer size={'m'} />
        </>
      ) : null}

      <EuiSearchBar
        query={queryInstance}
        box={{
          placeholder: i18n.translate('xpack.ml.notifications.searchPlaceholder', {
            defaultMessage:
              'Search for notifications. Example: job_type:anomaly_detector -level:(info) Datafeed',
          }),
          incremental: false,
          schema: {
            strict: true,
            fields: {
              level: {
                type: 'string',
                name: 'level',
                searchable: false,
                aggregatable: true,
              },
              job_type: {
                type: 'string',
                name: 'job_type',
                searchable: false,
                aggregatable: true,
              },
              job_id: {
                type: 'string',
                name: 'job_id',
                searchable: false,
                aggregatable: true,
              },
              message: {
                type: 'string',
                name: 'message',
                searchable: true,
                aggregatable: false,
              },
            },
          },
          'data-test-subj': 'mlNotificationsSearchBarInput',
        }}
        filters={filters}
        onChange={(e) => {
          updatePageState({ queryText: e.queryText });
        }}
        data-test-subj={'mlNotificationsSearchBar'}
      />

      <EuiSpacer size={'m'} />

      {queryError ? (
        <>
          <EuiCallOut
            size={'s'}
            title={
              <FormattedMessage
                id="xpack.ml.notifications.invalidQueryError"
                defaultMessage="Query is not valid: "
              />
            }
            color="danger"
            iconType="warning"
          >
            <p>{queryError}</p>
          </EuiCallOut>
          <EuiSpacer size={'m'} />
        </>
      ) : null}

      <EuiBasicTable<NotificationItem>
        columns={columns}
        hasActions={false}
        isExpandable={false}
        isSelectable={false}
        items={itemsPerPage}
        itemId={'id'}
        loading={isLoading}
        rowProps={(item) => ({
          'data-test-subj': `mlNotificationsTableRow row-${item.id}`,
        })}
        pagination={pagination}
        onChange={onTableChange}
        sorting={sorting}
        data-test-subj={isLoading ? 'mlNotificationsTable loading' : 'mlNotificationsTable loaded'}
        noItemsMessage={
          <FormattedMessage
            id="xpack.ml.notifications.noItemsFoundMessage"
            defaultMessage="No notifications found"
          />
        }
      />
    </>
  );
};
