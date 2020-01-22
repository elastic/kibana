/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useState, useMemo, useEffect } from 'react';
import React from 'react';
import { EuiDataGrid } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { AlertAction } from '../../store/alerts/action';
import * as selectors from '../../store/selectors';

export const AlertIndex = memo(() => {
  const columns: Array<{ id: string }> = [
    { id: 'alert_type' },
    { id: 'event_type' },
    { id: 'os' },
    { id: 'ip_address' },
    { id: 'host_name' },
    { id: 'timestamp' },
    { id: 'archived' },
    { id: 'malware_score' },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const dispatch: (action: AlertAction) => unknown = useDispatch();

  useEffect(() => {
    dispatch({ type: 'appRequestedAlertsData' });
  }, [dispatch]);

  const json = useSelector(selectors.alertListData);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (json.length === 0) {
        return null;
      }

      if (columnId === 'alert_type') {
        return json[rowIndex].value.source.endgame.metadata.key;
      } else if (columnId === 'event_type') {
        return json[rowIndex].value.source.endgame.data.file_operation;
      } else if (columnId === 'os') {
        return json[rowIndex].value.source.host.os.name;
      } else if (columnId === 'ip_address') {
        return json[rowIndex].value.source.host.ip;
      } else if (columnId === 'host_name') {
        return json[rowIndex].value.source.host.hostname;
      } else if (columnId === 'timestamp') {
        return json[rowIndex].value.source.endgame.timestamp_utc;
      } else if (columnId === 'archived') {
        return null; // TODO change this once its available in backend
      } else if (columnId === 'malware_score') {
        return json[rowIndex].value.source.endgame.data.malware_classification.score;
      }
      return null;
    };
  }, [json]);

  return (
    <EuiDataGrid
      aria-label="Alert List"
      rowCount={json.length}
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
    />
  );
});
