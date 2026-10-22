/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ResponsiveFlyout } from '../responsive_flyout';
import { RequestFlyoutHeader } from './header';
import { RequestFlyoutNoMetricsMessage } from './no_metrics_message';
import { RequestFlyoutContent } from './request_flyout_content';
import { RequestFlyoutContextProvider, type RequestFlyoutDeps } from './request_flyout_context';
import {
  hasMetrics,
  type RequestFlyoutConnection,
  type RequestFlyoutNoMetricsConnection,
} from './types';

interface RequestFlyoutProps {
  /** Memoize it: a new object on every render re-renders the whole flyout. */
  deps: RequestFlyoutDeps;
  connection: RequestFlyoutConnection | RequestFlyoutNoMetricsConnection;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
  onClose: () => void;
}

export type { RequestFlyoutDeps };

/**
 * Flyout of a service map edge: the RED metrics, latency distribution, and the operations or
 * transactions and failed calls of the connection, with child flyouts for the details of a row.
 *
 * The time range and environment are the ones of the map. Its kuery is not applied: the
 * connection is already scoped to the source and the target.
 */
export function RequestFlyout({
  deps,
  connection,
  environment,
  rangeFrom,
  rangeTo,
  onClose,
}: RequestFlyoutProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'requestFlyoutTitle' });
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const filters = useMemo(
    () => ({ environment, start, end, rangeFrom, rangeTo }),
    [environment, start, end, rangeFrom, rangeTo]
  );
  const contextValue = useMemo(
    () => (hasMetrics(connection) ? { deps, connection, filters } : null),
    [deps, connection, filters]
  );

  // The main flyout and its child flyouts share one history key: they form one EUI flyout session.
  const historyKey = useMemo(() => Symbol('apmRequestFlyout'), []);

  const title = `${connection.sourceLabel} → ${connection.targetLabel}`;

  const flyout = (
    <ResponsiveFlyout
      data-test-subj="requestFlyout"
      flyoutMenuDisplayMode="always"
      onClose={onClose}
      ownFocus={false}
      size="m"
      session="start"
      historyKey={historyKey}
      flyoutMenuProps={{ title }}
      aria-labelledby={titleId}
    >
      <RequestFlyoutHeader title={title} titleId={titleId} />
      {contextValue ? (
        <RequestFlyoutContent childSession="inherit" historyKey={historyKey} />
      ) : (
        <RequestFlyoutNoMetricsMessage />
      )}
    </ResponsiveFlyout>
  );

  if (!contextValue) {
    return flyout;
  }

  return (
    <RequestFlyoutContextProvider value={contextValue}>
      <TimeRangeMetadataContextProvider
        uiSettings={deps.core.uiSettings}
        start={start}
        end={end}
        kuery=""
        useSpanName={false}
      >
        {flyout}
      </TimeRangeMetadataContextProvider>
    </RequestFlyoutContextProvider>
  );
}
