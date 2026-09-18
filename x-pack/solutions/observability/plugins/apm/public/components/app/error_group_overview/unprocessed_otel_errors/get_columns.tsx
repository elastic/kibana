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
import type { Error } from '@kbn/apm-types';
import { Timestamp, TruncateWithTooltip } from '@kbn/apm-ui-shared';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { ERROR_GROUP_OVERVIEW_EBT_ELEMENTS } from '../ebt_constants';

interface GetColumnsParams {
  traceId: string;
  spanId: string;
  rangeFrom: string;
  rangeTo: string;
  /**
   * The log-sources index pattern from useLogsIndexPattern(). When undefined the
   * Discover links are disabled (the pattern has not resolved yet).
   */
  logsIndexPattern: string | undefined;
}

export function getColumns({
  traceId,
  spanId,
  rangeFrom,
  rangeTo,
  logsIndexPattern,
}: GetColumnsParams): Array<EuiBasicTableColumn<Error>> {
  return [
    {
      field: 'error.exception.message',
      name: i18n.translate('xpack.apm.unprocessedOtelErrors.columnMessage', {
        defaultMessage: 'Exception message',
      }),
      sortable: (item: Error) => item.error?.exception?.message ?? '',
      render: (_: unknown, item: Error) => {
        const message = item.error?.exception?.message ?? NOT_AVAILABLE_LABEL;
        return (
          <TruncateWithTooltip
            text={message}
            content={
              <OpenInDiscover
                indexType="logs"
                indexPattern={logsIndexPattern}
                variant="link"
                label={message}
                dataTestSubj="apmUnprocessedOtelErrorDiscoverLink"
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                queryParams={{
                  traceId,
                  spanId,
                  exceptionsOnly: true,
                  exceptionMessage: item.error?.exception?.message,
                  sortDirection: 'DESC',
                }}
                ebt={{ element: ERROR_GROUP_OVERVIEW_EBT_ELEMENTS.UNPROCESSED_OTEL_ERROR_ROW }}
              />
            }
          />
        );
      },
    },
    {
      field: 'error.exception.type',
      name: i18n.translate('xpack.apm.unprocessedOtelErrors.columnType', {
        defaultMessage: 'Type',
      }),
      width: '25%',
      sortable: (item: Error) => item.error?.exception?.type ?? '',
      render: (_: unknown, item: Error) => item.error?.exception?.type ?? NOT_AVAILABLE_LABEL,
    },
    {
      field: 'timestamp.us',
      name: i18n.translate('xpack.apm.unprocessedOtelErrors.columnOccurredAt', {
        defaultMessage: 'Occurred at',
      }),
      width: '20%',
      align: RIGHT_ALIGNMENT,
      sortable: true,
      render: (_: unknown, item: Error) => (
        <Timestamp
          timestamp={item.timestamp.us / 1000}
          timeUnit="milliseconds"
          renderMode="tooltip"
        />
      ),
    },
  ];
}
