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
import { usePageId } from '../use_page_id';
import { useAlertListSelector } from '../../store/alerts/alert_hooks';

export const AlertIndex = memo(() => {
  usePageId('alertsPage');
  const history = useHistory();

  const columns: EuiDataGridColumn[] = useMemo(() => {
    return [
      { id: 'Alert Type' },
      { id: 'Event Type' },
      { id: 'OS' },
      { id: 'IP Address' },
      { id: 'Host Name' },
      { id: 'Timestamp' },
      { id: 'Archived' },
      { id: 'Malware Score' },
    ];
  }, []);

  const { pageIndex, pageSize, total } = useAlertListSelector(selectors.alertListPagination);
  const urlFromNewPageSizeParam = useAlertListSelector(selectors.urlFromNewPageSizeParam);
  const urlFromNewPageIndexParam = useAlertListSelector(selectors.urlFromNewPageIndexParam);

  const onChangeItemsPerPage = useCallback(
    newPageSize => history.push(urlFromNewPageSizeParam(newPageSize)),
    [history, urlFromNewPageSizeParam]
  );

  const onChangePage = useCallback(
    newPageIndex => history.push(urlFromNewPageIndexParam(newPageIndex)),
    [history, urlFromNewPageIndexParam]
  );

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const json = useAlertListSelector(selectors.alertListData);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = json[rowIndex % pageSize];

      if (columnId === 'Alert Type') {
        return i18n.translate(
          'xpack.endpoint.application.endpoint.alerts.alertType.maliciousFileDescription',
          {
            defaultMessage: 'Malicious File',
          }
        );
      } else if (columnId === 'Event Type') {
        return row.event.action;
      } else if (columnId === 'OS') {
        return row.host.os.name;
      } else if (columnId === 'IP Address') {
        return row.host.ip;
      } else if (columnId === 'Host Name') {
        return row.host.hostname;
      } else if (columnId === 'Timestamp') {
        return row['@timestamp'];
      } else if (columnId === 'Archived') {
        return null;
      } else if (columnId === 'Malware Score') {
        return row.file_classification.malware_classification.score;
      }
      return null;
    };
  }, [json, pageSize, total]);

  return (
    <EuiPage data-test-subj="alertListPage">
      <EuiPageBody>
        <EuiPageContent>
          <EuiDataGrid
            aria-label="Alert List"
            rowCount={total}
            // Required. Sets up three columns, the last of which has a custom schema we later define down below.
            // The second column B won't allow clicking in to see the content in a popup.
            // The first column defines an starting width of 150px and prevents the user from resizing it
            columns={columns}
            // This allows you to initially hide columns. Users can still turn them on.
            columnVisibility={{
              visibleColumns,
              setVisibleColumns,
            }}
            // Often used in combination with useEffect() to dynamically change the render.
            renderCellValue={renderCellValue}
            pagination={{
              pageIndex,
              pageSize,
              pageSizeOptions: [10, 50, 100],
              onChangeItemsPerPage,
              onChangePage,
            }}
            data-test-subj="alertListGrid"
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});
