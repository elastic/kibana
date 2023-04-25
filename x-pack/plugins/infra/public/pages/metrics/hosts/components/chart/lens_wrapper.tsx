/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef } from 'react';

import { Action } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useIntersectedOnce } from '../../../../../hooks/use_intersection_once';
import { LensAttributes } from '../../../../../common/visualizations';
import { ChartLoader } from './chart_loader';

export interface LensWrapperProps {
  id: string;
  attributes: LensAttributes | null;
  dateRange: TimeRange;
  query: Query;
  filters: Filter[];
  extraActions: Action[];
  lastReloadRequestTime?: number;
  style?: React.CSSProperties;
  loading?: boolean;
  hasTitle?: boolean;
  onBrushEnd?: (data: BrushTriggerEvent['data']) => void;
  onLoad?: () => void;
}

export const LensWrapper = ({
  attributes,
  dateRange,
  filters,
  id,
  query,
  extraActions,
  style,
  onBrushEnd,
  lastReloadRequestTime,
  loading = false,
  hasTitle = false,
}: LensWrapperProps) => {
  const intersectionRef = useRef(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [state, setState] = useState({
    attributes,
    lastReloadRequestTime,
    query,
    filters,
    dateRange,
  });

  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const { intersectedOnce, intersection } = useIntersectedOnce(intersectionRef, {
    threshold: 1,
  });

  const EmbeddableComponent = lens.EmbeddableComponent;

  useEffect(() => {
    if ((intersection?.intersectionRatio ?? 0) === 1) {
      setState({
        attributes,
        lastReloadRequestTime,
        query,
        filters,
        dateRange,
      });
    }
  }, [
    attributes,
    dateRange,
    filters,
    intersection?.intersectionRatio,
    lastReloadRequestTime,
    query,
  ]);

  const isReady = state.attributes && intersectedOnce;

  return (
    <div ref={intersectionRef}>
      <ChartLoader
        loading={loading || !isReady}
        loadedOnce={loadedOnce}
        style={style}
        hasTitle={hasTitle}
      >
        {state.attributes && (
          <EmbeddableComponent
            id={id}
            style={style}
            attributes={state.attributes}
            viewMode={ViewMode.VIEW}
            timeRange={state.dateRange}
            query={state.query}
            filters={state.filters}
            extraActions={extraActions}
            lastReloadRequestTime={state.lastReloadRequestTime}
            executionContext={{
              type: 'infrastructure_observability_hosts_view',
              name: id,
            }}
            onBrushEnd={onBrushEnd}
            onLoad={() => {
              if (!loadedOnce) {
                setLoadedOnce(true);
              }
            }}
          />
        )}
      </ChartLoader>
    </div>
  );
};
