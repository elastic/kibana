/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { noop } from 'lodash';
import { useMount } from 'react-use';
import { EuiPanel } from '@elastic/eui';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useLogSource } from '../../containers/logs/log_source';
import { useLogStream } from '../../containers/logs/log_stream';

import { ScrollableLogTextStreamView } from '../logging/log_text_stream';

interface LogStreamProps {
  sourceId?: string;
  startTimestamp: number;
  endTimestamp: number;
  seamless?: boolean;
}

export const LogStream: React.FC<LogStreamProps> = ({
  sourceId = 'default',
  startTimestamp,
  endTimestamp,
  seamless = false,
}) => {
  // source boilerplate
  const { services } = useKibana();
  const {
    sourceConfiguration,
    loadSourceConfiguration,
    isLoadingSourceConfiguration,
  } = useLogSource({
    sourceId,
    fetch: services.http.fetch,
  });

  // Internal state
  const { loadingState, entries, fetchEntries } = useLogStream({
    sourceId,
    startTimestamp,
    endTimestamp,
  });

  // Derived state
  const isReloading =
    isLoadingSourceConfiguration || loadingState === 'uninitialized' || loadingState === 'loading';

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

  // Component lifetime
  useMount(() => {
    loadSourceConfiguration();
    fetchEntries();
  });

  const streamView = (
    <ScrollableLogTextStreamView
      target={null}
      columnConfigurations={columnConfigurations}
      items={streamItems}
      scale="medium"
      wrap={false}
      isReloading={isReloading}
      isLoadingMore={false}
      hasMoreBeforeStart={false}
      hasMoreAfterEnd={false}
      isStreaming={false}
      lastLoadedTime={null}
      jumpToTarget={noop}
      reportVisibleInterval={noop}
      loadNewerItems={noop}
      reloadItems={fetchEntries}
      highlightedItem={null}
      currentHighlightKey={null}
      startDateExpression={''}
      endDateExpression={''}
      updateDateRange={noop}
      startLiveStreaming={noop}
    />
  );

  // Rendering
  if (seamless) {
    return streamView;
  } else {
    return <EuiPanel>{streamView}</EuiPanel>;
  }
};
