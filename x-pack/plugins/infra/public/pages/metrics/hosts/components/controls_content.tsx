/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ControlGroupContainer, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { Subscription } from 'rxjs';
import { LazyControlsRenderer } from './lazy_controls_renderer';
import { useControlPanels } from '../hooks/use_control_panels_url_state';

interface Props {
  dataView: DataView;
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  onFiltersChange: (filters: Filter[]) => void;
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const ControlsContent: React.FC<Props> = ({
  dataView,
  filters,
  query,
  timeRange,
  onFiltersChange,
}) => {
  const [controlPanels, setControlPanels] = useControlPanels(dataView);
  const inputSubscription = useRef<Subscription>();
  const filterSubscription = useRef<Subscription>();

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupContainer) => {
      inputSubscription.current = controlGroup.onFiltersPublished$.subscribe((newFilters) => {
        onFiltersChange(newFilters);
      });

      filterSubscription.current = controlGroup
        .getInput$()
        .subscribe(({ panels }) => setControlPanels(panels));
    },
    [onFiltersChange, setControlPanels]
  );

  useEffect(() => {
    return () => {
      filterSubscription.current?.unsubscribe();
      inputSubscription.current?.unsubscribe();
    };
  }, []);

  return (
    <LazyControlsRenderer
      filters={filters}
      getInitialInput={async () => ({
        id: dataView.id ?? '',
        type: CONTROL_GROUP_TYPE,
        timeRange,
        refreshConfig: REFRESH_CONFIG,
        viewMode: ViewMode.VIEW,
        filters: [...filters],
        query,
        chainingSystem: 'HIERARCHICAL',
        controlStyle: 'oneLine',
        defaultControlWidth: 'small',
        panels: controlPanels,
      })}
      onLoadComplete={loadCompleteHandler}
      query={query}
      timeRange={timeRange}
    />
  );
};
