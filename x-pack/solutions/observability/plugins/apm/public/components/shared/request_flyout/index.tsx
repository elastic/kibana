/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutTemplate } from '@kbn/flyout-template';
import React, { useMemo } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useTimeRange } from '../../../hooks/use_time_range';
import { RequestFlyoutNoMetricsMessage } from './no_metrics_message';
import { RequestFlyoutLevel } from './request_flyout_level';
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
 * Flyout of a service map edge. The time range and environment are the ones of the map; its kuery
 * is not applied, the connection is already scoped to the source and the target.
 */
export function RequestFlyout({
  deps,
  connection,
  environment,
  rangeFrom,
  rangeTo,
  onClose,
}: RequestFlyoutProps) {
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

  if (!contextValue) {
    return (
      <FlyoutTemplate
        data-test-subj="requestFlyout"
        onClose={onClose}
        ownFocus={false}
        size="m"
        minWidth={660}
        session="start"
        historyKey={historyKey}
      >
        <FlyoutTemplate.Header title={title} />
        <FlyoutTemplate.Body>
          <RequestFlyoutNoMetricsMessage />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );
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
        <RequestFlyoutLevel
          data-test-subj="requestFlyout"
          title={title}
          onClose={onClose}
          session="start"
          size="m"
          childSession="inherit"
          historyKey={historyKey}
        />
      </TimeRangeMetadataContextProvider>
    </RequestFlyoutContextProvider>
  );
}
