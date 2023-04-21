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
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useIntersectedOnce } from '../../../../../hooks/use_intersection_once';
import { LensAttributes } from '../../../../../common/visualizations';
import { ChartLoader } from './chart_loader';

export interface Props {
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
}: Props) => {
  const intersectionRef = useRef(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [currentLastReloadRequestTime, setCurrentLastReloadRequestTime] = useState<
    number | undefined
  >(lastReloadRequestTime);
  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const { intersectedOnce, intersection } = useIntersectedOnce(intersectionRef, {
    threshold: 1,
  });

  const EmbeddableComponent = lens.EmbeddableComponent;

  useEffect(() => {
    if ((intersection?.intersectionRatio ?? 0) === 1) {
      setCurrentLastReloadRequestTime(lastReloadRequestTime);
    }
  }, [intersection?.intersectionRatio, lastReloadRequestTime]);

  const isReady = attributes && intersectedOnce;

  return (
    <div ref={intersectionRef}>
      {!isReady ? (
        <EuiFlexGroup style={style} justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" mono />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <ChartLoader loading={loading} loadedOnce={loadedOnce} style={style} hasTitle={hasTitle}>
          <EmbeddableComponent
            id={id}
            style={style}
            attributes={attributes}
            viewMode={ViewMode.VIEW}
            timeRange={dateRange}
            query={query}
            filters={filters}
            extraActions={extraActions}
            lastReloadRequestTime={currentLastReloadRequestTime}
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
        </ChartLoader>
      )}
    </div>
  );
};
