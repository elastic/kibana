/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RIGHT_ALIGNMENT } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Timestamp } from '@kbn/apm-ui-shared';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { ERROR_GROUP_OVERVIEW_EBT_ELEMENTS } from '../ebt_constants';
import type { ErrorFromLogsRow } from './use_service_errors_from_logs';

interface GetColumnsParams {
  rangeFrom: string;
  rangeTo: string;
  /**
   * The log-sources index pattern from useLogsIndexPattern(). When undefined the
   * Discover links are disabled (the pattern has not resolved yet).
   */
  logsIndexPattern: string | undefined;
  /** Omit the Type column in compact (Overview) mode. */
  isCompactMode?: boolean;
}

export function getColumns({
  rangeFrom,
  rangeTo,
  logsIndexPattern,
  isCompactMode = false,
}: GetColumnsParams): Array<EuiBasicTableColumn<ErrorFromLogsRow>> {
  const columns: Array<EuiBasicTableColumn<ErrorFromLogsRow>> = [
    {
      field: 'message',
      name: i18n.translate('xpack.apm.errorsFromLogs.columnMessage', {
        defaultMessage: 'Exception message',
      }),
      sortable: true,
      render: (_: unknown, item: ErrorFromLogsRow) => {
        const message = item.message || NOT_AVAILABLE_LABEL;
        return (
          <TruncateWithTooltip
            text={message}
            content={
              <OpenInDiscover
                indexType="logs"
                indexPattern={item.index ?? logsIndexPattern}
                variant="link"
                label={message}
                dataTestSubj="apmErrorsFromLogsDiscoverLink"
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                queryParams={{
                  traceId: item.traceId,
                  spanId: item.spanId,
                  exceptionsOnly: true,
                  // Narrow by `_id` scoped to the source index: document IDs are unique
                  // only within an index, so using the concrete index avoids false matches
                  // in rolled-over or custom log indices.
                  documentId: item.id,
                  sortDirection: 'DESC',
                }}
                ebt={{ element: ERROR_GROUP_OVERVIEW_EBT_ELEMENTS.ERRORS_FROM_LOGS_ROW }}
              />
            }
          />
        );
      },
    },
  ];

  if (!isCompactMode) {
    columns.push({
      field: 'type',
      name: i18n.translate('xpack.apm.errorsFromLogs.columnType', {
        defaultMessage: 'Type',
      }),
      width: '25%',
      sortable: true,
      render: (_: unknown, item: ErrorFromLogsRow) => item.type || NOT_AVAILABLE_LABEL,
    });
  }

  columns.push({
    field: 'timestampUs',
    name: i18n.translate('xpack.apm.errorsFromLogs.columnOccurredAt', {
      defaultMessage: 'Occurred at',
    }),
    width: '20%',
    align: RIGHT_ALIGNMENT,
    sortable: true,
    render: (_: unknown, item: ErrorFromLogsRow) => (
      <Timestamp timestamp={item.timestampUs / 1000} timeUnit="milliseconds" renderMode="tooltip" />
    ),
  });

  return columns;
}
