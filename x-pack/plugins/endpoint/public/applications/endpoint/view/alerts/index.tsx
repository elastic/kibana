/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import React from 'react';
import {
  EuiLink,
  EuiDataGrid,
  EuiDataGridColumn,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import * as selectors from '../../store/alerts/selectors';
import { useAlertListSelector } from './hooks/use_alerts_selector';

export const AlertIndex = memo(() => {
  const history = useHistory();

  const columns = useMemo((): EuiDataGridColumn[] => {
    return [
      {
        id: 'alert_type',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.alertType', {
          defaultMessage: 'Alert Type',
        }),
      },
      {
        id: 'event_type',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.eventType', {
          defaultMessage: 'Event Type',
        }),
      },
      {
        id: 'os',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.os', {
          defaultMessage: 'OS',
        }),
      },
      {
        id: 'ip_address',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.ipAddress', {
          defaultMessage: 'IP Address',
        }),
      },
      {
        id: 'host_name',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.hostName', {
          defaultMessage: 'Host Name',
        }),
      },
      {
        id: 'timestamp',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.timestamp', {
          defaultMessage: 'Timestamp',
        }),
      },
      {
        id: 'archived',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.archived', {
          defaultMessage: 'Archived',
        }),
      },
      {
        id: 'malware_score',
        display: i18n.translate('xpack.endpoint.application.endpoint.alerts.malwareScore', {
          defaultMessage: 'Malware Score',
        }),
      },
    ];
  }, []);

  // TODO consider structuredSelector
  const { pageIndex, pageSize, total } = useAlertListSelector(selectors.alertListPagination);
  const urlFromNewPageSizeParam = useAlertListSelector(selectors.urlFromNewPageSizeParam);
  const urlWithSelectedAlert = useAlertListSelector(selectors.urlWithSelectedAlert);
  const urlWithoutSelectedAlert = useAlertListSelector(selectors.urlWithoutSelectedAlert);
  const urlFromNewPageIndexParam = useAlertListSelector(selectors.urlFromNewPageIndexParam);
  const alertListData = useAlertListSelector(selectors.alertListData);
  const hasSelectedAlert = useAlertListSelector(selectors.hasSelectedAlert);

  const onChangeItemsPerPage = useCallback(
    newPageSize => history.push(urlFromNewPageSizeParam(newPageSize)),
    [history, urlFromNewPageSizeParam]
  );

  const onChangePage = useCallback(
    newPageIndex => history.push(urlFromNewPageIndexParam(newPageIndex)),
    [history, urlFromNewPageIndexParam]
  );

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));
  const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleAlertClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (event.target instanceof HTMLElement) {
        const alertId: string | undefined = event.target.dataset.alertId;
        if (alertId !== undefined) {
          history.push(urlWithSelectedAlert(alertId));
        }
      }
    },
    [history, urlWithSelectedAlert]
  );

  const handleFlyoutClose = useCallback(() => {
    history.push(urlWithoutSelectedAlert);
  }, [history, urlWithoutSelectedAlert]);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = alertListData[rowIndex % pageSize];

      if (columnId === 'alert_type') {
        return (
          <EuiLink data-alert-id={'TODO'} onClick={handleAlertClick}>
            {/* TODO populate data-alert-id with something real */}
            {i18n.translate(
              'xpack.endpoint.application.endpoint.alerts.alertType.maliciousFileDescription',
              {
                defaultMessage: 'Malicious File',
              }
            )}
          </EuiLink>
        );
      } else if (columnId === 'event_type') {
        return row.event.action;
      } else if (columnId === 'os') {
        return row.host.os.name;
      } else if (columnId === 'ip_address') {
        return row.host.ip;
      } else if (columnId === 'host_name') {
        return row.host.hostname;
      } else if (columnId === 'timestamp') {
        const date = new Date(row['@timestamp']);
        if (isFinite(date.getTime())) {
          return formatter.format(date);
        } else {
          return (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.endpoint.application.endpoint.alerts.alertDate.timestampInvalidLabel',
                {
                  defaultMessage: 'invalid',
                }
              )}
            </EuiBadge>
          );
        }
      } else if (columnId === 'archived') {
        return null;
      } else if (columnId === 'malware_score') {
        return row.file_classification.malware_classification.score;
      }
      return null;
    };
  }, [alertListData, formatter, handleAlertClick, pageSize, total]);

  const pagination = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      pageSizeOptions: [10, 20, 50],
      onChangeItemsPerPage,
      onChangePage,
    };
  }, [onChangeItemsPerPage, onChangePage, pageIndex, pageSize]);

  return (
    <>
      {/*
          TODO, rethink this. we may already have this in state. we still need `hasSelectedAlert`, to know to show this flyout. we should also have `selectedAlert`, which will eventually be loaded from server. */}
      {hasSelectedAlert && (
        <EuiFlyout size="l" onClose={handleFlyoutClose}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                alert detailz
                {/* TODO, make an issue to add logic to get selected alert. it might already be in state! */}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>hey!</EuiFlyoutBody>
        </EuiFlyout>
      )}
      <EuiPage data-test-subj="alertListPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiDataGrid
              aria-label="Alert List"
              rowCount={total}
              columns={columns}
              columnVisibility={{
                visibleColumns,
                setVisibleColumns,
              }}
              renderCellValue={renderCellValue}
              pagination={pagination}
              data-test-subj="alertListGrid"
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
});
