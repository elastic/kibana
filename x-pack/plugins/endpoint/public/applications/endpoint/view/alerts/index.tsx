/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import React from 'react';
import { EuiDataGrid, EuiDataGridColumn, EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import * as selectors from '../../store/alerts/selectors';
import { useAlertListSelector } from './hooks/use_alerts_selector';

export const AlertIndex = memo(() => {
  const history = useHistory();

  const columns: EuiDataGridColumn[] = useMemo(() => {
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
  const urlFromNewPageSizeParam = useAlertListSelector(selectors.urlFromNewPageSizeParam);
  const urlFromNewPageIndexParam = useAlertListSelector(selectors.urlFromNewPageIndexParam);
  const alertListData = useAlertListSelector(selectors.alertListData);

  const onChangeItemsPerPage = useCallback(
    newPageSize => history.push(urlFromNewPageSizeParam(newPageSize)),
    [history, urlFromNewPageSizeParam]
  );

  const onChangePage = useCallback(
    newPageIndex => history.push(urlFromNewPageIndexParam(newPageIndex)),
    [history, urlFromNewPageIndexParam]
  );

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = alertListData[rowIndex % pageSize];

      if (columnId === 'alert_type') {
        return i18n.translate(
          'xpack.endpoint.application.endpoint.alerts.alertType.maliciousFileDescription',
          {
            defaultMessage: 'Malicious File',
          }
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
        return row['@timestamp'];
      } else if (columnId === 'archived') {
        return null;
      } else if (columnId === 'malware_score') {
        return row.file_classification.malware_classification.score;
      }
      return null;
    };
  }, [alertListData, pageSize, total]);

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
  );
});
