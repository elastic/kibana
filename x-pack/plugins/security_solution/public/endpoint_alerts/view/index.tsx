/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
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
import { AlertData } from '../../../common/endpoint_alerts/types';
import { urlFromQueryParams } from './url_from_query_params';
import * as selectors from '../store/selectors';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import { AlertDetailsOverview } from './details';
import { FormattedDate } from './formatted_date';
import { AlertIndexSearchBar } from './index_search_bar';
import { Immutable } from '../../../common/endpoint/types';

export const AlertIndex = memo(() => {
  const history = useHistory();

  const columns = useMemo((): EuiDataGridColumn[] => {
    return [
      {
        id: 'alert_type',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.alertType',
          {
            defaultMessage: 'Alert Type',
          }
        ),
      },
      {
        id: 'event_type',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.eventType',
          {
            defaultMessage: 'Event Type',
          }
        ),
      },
      {
        id: 'os',
        display: i18n.translate('xpack.securitySolution.endpoint.application.endpoint.alerts.os', {
          defaultMessage: 'OS',
        }),
      },
      {
        id: 'ip_address',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.ipAddress',
          {
            defaultMessage: 'IP Address',
          }
        ),
      },
      {
        id: 'host_name',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.hostName',
          {
            defaultMessage: 'Host Name',
          }
        ),
      },
      {
        id: 'timestamp',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.timestamp',
          {
            defaultMessage: 'Timestamp',
          }
        ),
      },
      {
        id: 'archived',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.archived',
          {
            defaultMessage: 'Archived',
          }
        ),
      },
      {
        id: 'malware_score',
        display: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alerts.malwareScore',
          {
            defaultMessage: 'Malware Score',
          }
        ),
      },
    ];
  }, []);

  const { pageIndex, pageSize, total } = useAlertListSelector(selectors.alertListPagination);
  const alertListData = useAlertListSelector(selectors.alertListData);
  const hasSelectedAlert = useAlertListSelector(selectors.hasSelectedAlert);
  const queryParams = useAlertListSelector(selectors.uiQueryParams);

  const onChangeItemsPerPage = useCallback(
    (newPageSize) => {
      const newQueryParms = { ...queryParams };
      newQueryParms.page_size = newPageSize;
      delete newQueryParms.page_index;
      const relativeURL = urlFromQueryParams(newQueryParms);
      return history.push(relativeURL);
    },
    [history, queryParams]
  );

  const onChangePage = useCallback(
    (newPageIndex) => {
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
    const { active_details_tab, selected_alert, ...paramsWithoutFlyoutDetails } = queryParams;
    history.push(urlFromQueryParams(paramsWithoutFlyoutDetails));
  }, [history, queryParams]);

  const timestampForRows: Map<Immutable<AlertData>, number> = useMemo(() => {
    return new Map(
      alertListData.map((alertData) => {
        return [alertData, alertData['@timestamp']];
      })
    );
  }, [alertListData]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = alertListData[rowIndex % pageSize];
      if (columnId === 'alert_type') {
        return (
          <EuiLink
            data-test-subj="alertTypeCellLink"
            onClick={() =>
              history.push(urlFromQueryParams({ ...queryParams, selected_alert: row.id }))
            }
          >
            {i18n.translate(
              'xpack.securitySolution.endpoint.application.endpoint.alerts.alertType.maliciousFileDescription',
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
                'xpack.securitySolution.endpoint.application.endpoint.alerts.alertDate.timestampInvalidLabel',
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
        return row.file.Ext.malware_classification.score;
      }
      return null;
    },
    [total, alertListData, pageSize, history, queryParams, timestampForRows]
  );

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
        <EuiFlyout data-test-subj="alertDetailFlyout" size="l" onClose={handleFlyoutClose}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate(
                  'xpack.securitySolution.endpoint.application.endpoint.alerts.detailsTitle',
                  {
                    defaultMessage: 'Alert Details',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {selectedAlertData ? <AlertDetailsOverview /> : <EuiLoadingSpinner size="xl" />}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
      <EuiPage data-test-subj="alertListPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle size="l">
                  <h1 data-test-subj="alertsViewTitle">
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.alertList.viewTitle"
                      defaultMessage="Alerts"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <AlertIndexSearchBar />
              <EuiDataGrid
                aria-label="Alert List"
                rowCount={total}
                columns={columns}
                columnVisibility={columnVisibility}
                renderCellValue={renderCellValue}
                pagination={pagination}
                data-test-subj="alertListGrid"
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
});

AlertIndex.displayName = 'AlertIndex';
