/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';
import { EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as rt from 'io-ts';
import React, { useMemo } from 'react';
import { LogEntryField } from '../../../../common/log_entry';
import { LogEntry } from '../../../../common/search_strategies/log_entries/log_entry';
import { TimeKey } from '../../../../common/time';
import { JsonScalar, jsonScalarRT } from '../../../../common/typed_json';
import { FieldValue } from '../log_text_stream/field_value';

export const LogEntryFieldsTable: React.FC<{
  logEntry: LogEntry;
  onSetFieldFilter?: (filter: Query, logEntryId: string, timeKey?: TimeKey) => void;
}> = ({ logEntry, onSetFieldFilter }) => {
  const createSetFilterHandler = useMemo(
    () =>
      onSetFieldFilter
        ? (field: LogEntryField) => () => {
            if (!rt.array(jsonScalarRT).is(field.value)) {
              return;
            }

            onSetFieldFilter?.(
              {
                language: 'kuery',
                query: `${escapeKueryLiteral(field.field)}:${field.value
                  .map(escapeKueryLiteral)
                  .join(' OR ')}`,
              },
              logEntry.id,
              logEntry.cursor
            );
          }
        : undefined,
    [logEntry, onSetFieldFilter]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<LogEntryField>>>(
    () => [
      {
        field: 'field',
        name: i18n.translate('xpack.infra.logFlyout.fieldColumnLabel', {
          defaultMessage: 'Field',
        }),
        sortable: true,
      },
      {
        actions: [
          {
            type: 'icon',
            icon: 'filter',
            name: setFilterButtonLabel,
            description: setFilterButtonDescription,
            available: () => !!createSetFilterHandler,
            onClick: (item) => createSetFilterHandler?.(item)(),
          },
        ],
      },
      {
        field: 'value',
        name: i18n.translate('xpack.infra.logFlyout.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        render: (_name: string, item: LogEntryField) => (
          <FieldValue
            highlightTerms={emptyHighlightTerms}
            isActiveHighlight={false}
            value={item.value}
          />
        ),
      },
    ],
    [createSetFilterHandler]
  );

  return (
    <EuiInMemoryTable<LogEntryField>
      columns={columns}
      items={logEntry.fields}
      search={searchOptions}
      sorting={initialSortingOptions}
    />
  );
};

const emptyHighlightTerms: string[] = [];

const initialSortingOptions = {
  sort: {
    field: 'field',
    direction: 'asc' as const,
  },
};

const searchOptions = {
  box: {
    incremental: true,
    schema: true,
  },
};

const setFilterButtonLabel = i18n.translate('xpack.infra.logFlyout.filterAriaLabel', {
  defaultMessage: 'Filter',
});

const setFilterButtonDescription = i18n.translate('xpack.infra.logFlyout.setFilterTooltip', {
  defaultMessage: 'View event with filter',
});

const escapeKueryLiteral = (unquotedLiteral: JsonScalar): JsonScalar =>
  typeof unquotedLiteral === 'string'
    ? `"${unquotedLiteral.replace(/"/g, '\\"')}"`
    : unquotedLiteral;
