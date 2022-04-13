/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, Filter, Query } from '@kbn/es-query';
import { JsonValue } from '@kbn/utility-types';
import { noop } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { LogEntryCursor } from '../../../common/log_entry';
import { defaultLogViewsStaticConfig } from '../../../common/log_views';
import { BuiltEsQuery, useLogStream } from '../../containers/logs/log_stream';
import { useLogView } from '../../hooks/use_log_view';
import { LogViewsClient } from '../../services/log_views';
import { LogColumnRenderConfiguration } from '../../utils/log_column_render_configuration';
import { useKibanaQuerySettings } from '../../utils/use_kibana_query_settings';
import { ScrollableLogTextStreamView } from '../logging/log_text_stream';
import { LogStreamErrorBoundary } from './log_stream_error_boundary';

interface LogStreamPluginDeps {
  data: DataPublicPluginStart;
}

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

export interface LogStreamProps extends LogStreamContentProps {
  height?: string | number;
}

interface LogStreamContentProps {
  sourceId?: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string | Query | BuiltEsQuery;
  filters?: Filter[];
  center?: LogEntryCursor;
  highlight?: string;
  columns?: LogColumnDefinition[];
}

export const LogStream: React.FC<LogStreamProps> = ({ height = 400, ...contentProps }) => {
  return (
    <LogStreamContainer style={{ height }}>
      <LogStreamErrorBoundary resetOnChange={[contentProps.query]}>
        <LogStreamContent {...contentProps} />
      </LogStreamErrorBoundary>
    </LogStreamContainer>
  );
};

export const LogStreamContent: React.FC<LogStreamContentProps> = ({
  sourceId = 'default',
  startTimestamp,
  endTimestamp,
  query,
  filters,
  center,
  highlight,
  columns,
}) => {
  const customColumns = useMemo(
    () => (columns ? convertLogColumnDefinitionToLogSourceColumnDefinition(columns) : undefined),
    [columns]
  );

  const {
    services: { http, data },
  } = useKibana<LogStreamPluginDeps>();
  if (http == null || data == null) {
    throw new Error(
      `<LogStream /> cannot access kibana core services.

Ensure the component is mounted within kibana-react's <KibanaContextProvider> hierarchy.
Read more at https://github.com/elastic/kibana/blob/main/src/plugins/kibana_react/README.md"
`
    );
  }

  const kibanaQuerySettings = useKibanaQuerySettings();

  const logViews = useMemo(
    () => new LogViewsClient(data.dataViews, http, data.search.search, defaultLogViewsStaticConfig),
    [data.dataViews, data.search.search, http]
  );

  const {
    derivedDataView,
    isLoading: isLoadingLogView,
    load: loadLogView,
    resolvedLogView,
  } = useLogView({
    logViewId: sourceId,
    logViews,
    fetch: http.fetch,
  });

  const parsedQuery = useMemo<BuiltEsQuery | undefined>(() => {
    if (typeof query === 'object' && 'bool' in query) {
      return mergeBoolQueries(
        query,
        buildEsQuery(derivedDataView, [], filters ?? [], kibanaQuerySettings)
      );
    } else {
      return buildEsQuery(
        derivedDataView,
        coerceToQueries(query),
        filters ?? [],
        kibanaQuerySettings
      );
    }
  }, [derivedDataView, filters, kibanaQuerySettings, query]);

  // Internal state
  const {
    entries,
    fetchEntries,
    fetchNextEntries,
    fetchPreviousEntries,
    hasMoreAfter,
    hasMoreBefore,
    isLoadingMore,
    isReloading: isLoadingEntries,
  } = useLogStream({
    sourceId,
    startTimestamp,
    endTimestamp,
    query: parsedQuery,
    center,
    columns: customColumns,
  });

  const columnConfigurations = useMemo(() => {
    return resolvedLogView ? customColumns ?? resolvedLogView.columns : [];
  }, [resolvedLogView, customColumns]);

  const streamItems = useMemo(
    () =>
      entries.map((entry) => ({
        kind: 'logEntry' as const,
        logEntry: entry,
        highlights: [],
      })),
    [entries]
  );

  // Component lifetime
  useEffect(() => {
    loadLogView();
  }, [loadLogView]);

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
    <ScrollableLogTextStreamView
      target={center ? center : entries.length ? entries[entries.length - 1].cursor : null}
      columnConfigurations={columnConfigurations}
      items={streamItems}
      scale="medium"
      wrap={true}
      isReloading={isLoadingLogView || isLoadingEntries}
      isLoadingMore={isLoadingMore}
      hasMoreBeforeStart={hasMoreBefore}
      hasMoreAfterEnd={hasMoreAfter}
      isStreaming={false}
      jumpToTarget={noop}
      reportVisibleInterval={handlePagination}
      reloadItems={fetchEntries}
      highlightedItem={highlight ?? null}
      currentHighlightKey={null}
      startDateExpression={''}
      endDateExpression={''}
      updateDateRange={noop}
      startLiveStreaming={noop}
      hideScrollbar={false}
    />
  );
};

const LogStreamContainer = euiStyled.div`
  display: flex;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
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

const mergeBoolQueries = (firstQuery: BuiltEsQuery, secondQuery: BuiltEsQuery): BuiltEsQuery => ({
  bool: {
    must: [...firstQuery.bool.must, ...secondQuery.bool.must],
    filter: [...firstQuery.bool.filter, ...secondQuery.bool.filter],
    should: [...firstQuery.bool.should, ...secondQuery.bool.should],
    must_not: [...firstQuery.bool.must_not, ...secondQuery.bool.must_not],
  },
});

const coerceToQueries = (value: undefined | string | Query): Query[] => {
  if (value == null) {
    return [];
  } else if (typeof value === 'string') {
    return [{ language: 'kuery', query: value }];
  } else if ('language' in value && 'query' in value) {
    return [value];
  }

  return [];
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default LogStream;
