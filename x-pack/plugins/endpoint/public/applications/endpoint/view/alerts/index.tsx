/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import React from 'react';
import {
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
  EuiLoadingSpinner,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { urlFromQueryParams } from './url_from_query_params';
import { AlertData } from '../../../../../common/types';
import * as selectors from '../../store/alerts/selectors';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import { AlertDetailsOverview } from './details';
import { FormattedDate } from './formatted_date';

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

  const { pageIndex, pageSize, total } = useAlertListSelector(selectors.alertListPagination);
  const alertListData = useAlertListSelector(selectors.alertListData);
  const hasSelectedAlert = useAlertListSelector(selectors.hasSelectedAlert);
  const queryParams = useAlertListSelector(selectors.uiQueryParams);

  const onChangeItemsPerPage = useCallback(
    newPageSize => {
      const newQueryParms = { ...queryParams };
      newQueryParms.page_size = newPageSize;
      delete newQueryParms.page_index;
      const relativeURL = urlFromQueryParams(newQueryParms);
      return history.push(relativeURL);
    },
    [history, queryParams]
  );

  const onChangePage = useCallback(
    newPageIndex => {
      return history.push(
        urlFromQueryParams({
          ...queryParams,
          page_index: newPageIndex,
        })
      );
    },
    [history, queryParams]
  );

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const handleFlyoutClose = useCallback(() => {
    const { selected_alert, ...paramsWithoutSelectedAlert } = queryParams;
    history.push(urlFromQueryParams(paramsWithoutSelectedAlert));
  }, [history, queryParams]);

  const timestampForRows: Map<AlertData, number> = useMemo(() => {
    return new Map(
      alertListData.map(alertData => {
        return [alertData, alertData['@timestamp']];
      })
    );
  }, [alertListData]);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = alertListData[rowIndex % pageSize];
      if (columnId === 'alert_type') {
        return (
          <EuiLink
            data-testid="alertTypeCellLink"
            onClick={() =>
              history.push(urlFromQueryParams({ ...queryParams, selected_alert: row.id }))
            }
          >
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
        const timestamp = timestampForRows.get(row)!;
        if (timestamp) {
          return <FormattedDate timestamp={timestamp} />;
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
        return row.file.malware_classifier.score;
      }
      return null;
    };
  }, [total, alertListData, pageSize, history, queryParams, timestampForRows]);

  const pagination = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      pageSizeOptions: [10, 20, 50],
      onChangeItemsPerPage,
      onChangePage,
    };
  }, [onChangeItemsPerPage, onChangePage, pageIndex, pageSize]);

  const columnVisibility = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns,
    }),
    [setVisibleColumns, visibleColumns]
  );

  const selectedAlertData = useAlertListSelector(selectors.selectedAlertDetailsData);

  return (
    <>
      {hasSelectedAlert && (
        <EuiFlyout data-testid="alertDetailFlyout" size="l" onClose={handleFlyoutClose}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.endpoint.application.endpoint.alerts.detailsTitle', {
                  defaultMessage: 'Alert Details',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {selectedAlertData ? <AlertDetailsOverview /> : <EuiLoadingSpinner size="xl" />}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
      <EuiPage data-test-subj="alertListPage" data-testid="alertListPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.endpoint.alertList.viewTitle"
                      defaultMessage="Alerts"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiDataGrid
                aria-label="Alert List"
                rowCount={total}
                columns={columns}
                columnVisibility={columnVisibility}
                renderCellValue={renderCellValue}
                pagination={pagination}
                data-test-subj="alertListGrid"
                data-testid="alertListGrid"
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
});
