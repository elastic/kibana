/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import React, { useMemo, type FC } from 'react';
import type {
  AnomalySwimLaneEmbeddableApi,
  AnomalySwimlaneEmbeddableCustomInput,
  AnomalySwimLaneEmbeddableState,
} from '../embeddables';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables';

export interface AnomalySwimLaneProps extends AnomalySwimlaneEmbeddableCustomInput {
  id?: string;
}

export const AnomalySwimLane: FC<AnomalySwimLaneProps> = ({
  id,
  jobIds,
  swimlaneType,
  viewBy,
  timeRange,
  filters,
  query,
  refreshConfig,
}) => {
  const rawState: AnomalySwimLaneEmbeddableState = useMemo(() => {
    return {
      jobIds,
      swimlaneType,
      timeRange,
      refreshConfig,
      viewBy,
      query,
      filters,
    };
  }, [filters, jobIds, query, refreshConfig, swimlaneType, timeRange, viewBy]);

  return (
    <ReactEmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
      maybeId={id}
      type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
      state={{
        rawState,
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default AnomalySwimLane;
