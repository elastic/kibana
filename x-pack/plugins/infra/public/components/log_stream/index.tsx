/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { noop } from 'lodash';
import { euiStyled } from '../../../../observability/public';

import { LogEntryCursor } from '../../../common/log_entry';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useLogSource } from '../../containers/logs/log_source';
import { useLogStream } from '../../containers/logs/log_stream';

import { ScrollableLogTextStreamView } from '../logging/log_text_stream';
import { LogColumnRenderConfiguration } from '../../utils/log_column_render_configuration';
import { JsonValue } from '../../../../../../src/plugins/kibana_utils/common';

const PAGE_THRESHOLD = 2;

interface CommonColumnDefinition {
  /** width of the column, in CSS units */
  width?: number | string;
  /** Content for the header. `true` renders the field name. `false` renders nothing. A string renders a custom value */
  header?: boolean | string;
}

interface TimestampColumnDefinition extends CommonColumnDefinition {
  type: 'timestamp';
  /** Timestamp renderer. Takes a epoch_millis and returns a valid `ReactNode` */
  render?: (timestamp: number) => React.ReactNode;
}

interface MessageColumnDefinition extends CommonColumnDefinition {
  type: 'message';
  /** Message renderer. Takes the processed message and returns a valid `ReactNode` */
  render?: (message: string) => React.ReactNode;
}

interface FieldColumnDefinition extends CommonColumnDefinition {
  type: 'field';
  field: string;
  /** Field renderer. Takes the value of the field and returns a valid `ReactNode` */
  render?: (value: JsonValue) => React.ReactNode;
}

type LogColumnDefinition =
  | TimestampColumnDefinition
  | MessageColumnDefinition
  | FieldColumnDefinition;

export interface LogStreamProps {
  sourceId?: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string;
  center?: LogEntryCursor;
  highlight?: string;
  height?: string | number;
  columns?: LogColumnDefinition[];
}

export const LogStream: React.FC<LogStreamProps> = ({
  sourceId = 'default',
  startTimestamp,
  endTimestamp,
  query,
  center,
  highlight,
  height = '400px',
  columns,
}) => {
  const customColumns = useMemo(
    () => (columns ? convertLogColumnDefinitionToLogSourceColumnDefinition(columns) : undefined),
    [columns]
  );

  // source boilerplate
  const { services } = useKibana();
  if (!services?.http?.fetch) {
    throw new Error(
      `<LogStream /> cannot access kibana core services.

Ensure the component is mounted within kibana-react's <KibanaContextProvider> hierarchy.
Read more at https://github.com/elastic/kibana/blob/master/src/plugins/kibana_react/README.md"
`
    );
  }

  const {
    sourceConfiguration,
    loadSourceConfiguration,
    isLoadingSourceConfiguration,
  } = useLogSource({
    sourceId,
    fetch: services.http.fetch,
  });

  // Internal state
  const {
    loadingState,
    pageLoadingState,
    entries,
    hasMoreBefore,
    hasMoreAfter,
    fetchEntries,
    fetchPreviousEntries,
    fetchNextEntries,
  } = useLogStream({
    sourceId,
    startTimestamp,
    endTimestamp,
    query,
    center,
    columns: customColumns,
  });

  // Derived state
  const isReloading =
    isLoadingSourceConfiguration || loadingState === 'uninitialized' || loadingState === 'loading';

  const isLoadingMore = pageLoadingState === 'loading';

  const columnConfigurations = useMemo(() => {
    return sourceConfiguration ? customColumns ?? sourceConfiguration.configuration.logColumns : [];
  }, [sourceConfiguration, customColumns]);

  const streamItems = useMemo(
    () =>
      entries.map((entry) => ({
        kind: 'logEntry' as const,
        logEntry: entry,
        highlights: [],
      })),
    [entries]
  );

  const parsedHeight = typeof height === 'number' ? `${height}px` : height;

  // Component lifetime
  useEffect(() => {
    loadSourceConfiguration();
  }, [loadSourceConfiguration]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Pagination handler
  const handlePagination = useCallback(
    ({ fromScroll, pagesBeforeStart, pagesAfterEnd }) => {
      if (!fromScroll) {
        return;
      }

      if (isLoadingMore) {
        return;
      }

      if (pagesBeforeStart < PAGE_THRESHOLD) {
        fetchPreviousEntries();
      } else if (pagesAfterEnd < PAGE_THRESHOLD) {
        fetchNextEntries();
      }
    },
    [isLoadingMore, fetchPreviousEntries, fetchNextEntries]
  );

  return (
    <LogStreamContent height={parsedHeight}>
      <ScrollableLogTextStreamView
        target={center ? center : entries.length ? entries[entries.length - 1].cursor : null}
        columnConfigurations={columnConfigurations}
        items={streamItems}
        scale="medium"
        wrap={true}
        isReloading={isReloading}
        isLoadingMore={isLoadingMore}
        hasMoreBeforeStart={hasMoreBefore}
        hasMoreAfterEnd={hasMoreAfter}
        isStreaming={false}
        lastLoadedTime={null}
        jumpToTarget={noop}
        reportVisibleInterval={handlePagination}
        loadNewerItems={noop}
        reloadItems={fetchEntries}
        highlightedItem={highlight ?? null}
        currentHighlightKey={null}
        startDateExpression={''}
        endDateExpression={''}
        updateDateRange={noop}
        startLiveStreaming={noop}
        hideScrollbar={false}
      />
    </LogStreamContent>
  );
};

const LogStreamContent = euiStyled.div<{ height: string }>`
  display: flex;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  height: ${(props) => props.height};
`;

function convertLogColumnDefinitionToLogSourceColumnDefinition(
  columns: LogColumnDefinition[]
): LogColumnRenderConfiguration[] {
  return columns.map((column) => {
    // We extract the { width, header, render } inside each block so the TS compiler uses the right type for `render`
    switch (column.type) {
      case 'timestamp': {
        const { width, header, render } = column;
        return { timestampColumn: { id: '___#timestamp', width, header, render } };
      }
      case 'message': {
        const { width, header, render } = column;
        return { messageColumn: { id: '___#message', width, header, render } };
      }
      case 'field': {
        const { width, header, render } = column;
        return {
          fieldColumn: { id: `___#${column.field}`, field: column.field, width, header, render },
        };
      }
    }
  });
}

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default LogStream;
