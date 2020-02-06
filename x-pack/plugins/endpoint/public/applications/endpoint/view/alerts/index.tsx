/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import React from 'react';
import { EuiDataGrid } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import qs from 'querystring';
import * as selectors from '../../store/selectors';
import { usePageId } from '../use_page_id';

export const AlertIndex = memo(() => {
  usePageId('alertsPage');
  const history = useHistory();

  const columns: Array<{ id: string }> = useMemo(() => {
    return [
      { id: 'alert_type' },
      { id: 'event_type' },
      { id: 'os' },
      { id: 'ip_address' },
      { id: 'host_name' },
      { id: 'timestamp' },
      { id: 'archived' },
      { id: 'malware_score' },
    ];
  }, []);

  const { pageIndex, pageSize, total } = useSelector(selectors.alertListPagination);

  const urlPaginationData = useSelector(selectors.paginationDataFromUrl);

  const formattedQueryString = useCallback(
    (queryKey, value) => {
      urlPaginationData[queryKey] = value;
      return '?' + qs.stringify(urlPaginationData);
    },
    [urlPaginationData]
  );

  const onChangeItemsPerPage = useCallback(
    newPageSize => history.push(formattedQueryString('page_size', newPageSize)),
    [formattedQueryString, history]
  );

  const onChangePage = useCallback(
    newPageIndex => history.push(formattedQueryString('page_index', newPageIndex)),
    [formattedQueryString, history]
  );

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const json = useSelector(selectors.alertListData);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (rowIndex > total) {
        return null;
      }

      const row = json[rowIndex % pageSize];

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
  }, [json, pageSize, total]);

  return (
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
    />
  );
});
