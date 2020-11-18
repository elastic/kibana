/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { noop } from 'lodash';
import { euiStyled } from '../../../../observability/public';

import { LogEntriesCursor } from '../../../common/http_api';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useLogSource } from '../../containers/logs/log_source';
import { useLogStream } from '../../containers/logs/log_stream';

import { ScrollableLogTextStreamView } from '../logging/log_text_stream';

const PAGE_THRESHOLD = 2;

export interface LogStreamProps {
  sourceId?: string;
  startTimestamp: number;
  endTimestamp: number;
  query?: string;
  center?: LogEntriesCursor;
  highlight?: string;
  height?: string | number;
}

export const LogStream: React.FC<LogStreamProps> = ({
  sourceId = 'default',
  startTimestamp,
  endTimestamp,
  query,
  center,
  highlight,
  height = '400px',
}) => {
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
  });

  // Derived state
  const isReloading =
    isLoadingSourceConfiguration || loadingState === 'uninitialized' || loadingState === 'loading';

  const isLoadingMore = pageLoadingState === 'loading';

  const columnConfigurations = useMemo(() => {
    return sourceConfiguration ? sourceConfiguration.configuration.logColumns : [];
  }, [sourceConfiguration]);

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

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default LogStream;
