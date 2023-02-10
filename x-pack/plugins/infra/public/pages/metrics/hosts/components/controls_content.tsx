/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { ControlGroupContainer, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Filter, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { LazyControlsRenderer } from './lazy_controls_renderer';
import { useControlPanels } from '../hooks/use_control_panels_url_state';

interface Props {
  timeRange: TimeRange;
  dataView: DataView;
  filters: Filter[];
  query: {
    language: string;
    query: string;
  };
  onFilterChange: (filters: Filter[]) => void;
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const ControlsContent: React.FC<Props> = ({
  timeRange,
  dataView,
  query,
  filters,
  onFilterChange,
}) => {
  const [controlPanel, setControlPanels] = useControlPanels(dataView);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer | undefined>();

  useEffect(() => {
    if (!controlGroup) {
      return;
    }
    const filtersSubscription = controlGroup.onFiltersPublished$.subscribe((newFilters) => {
      onFilterChange(newFilters);
    });
    const inputSubscription = controlGroup.getInput$().subscribe(({ panels }) => {
      setControlPanels(panels);
    });

    return () => {
      filtersSubscription.unsubscribe();
      inputSubscription.unsubscribe();
    };
  }, [controlGroup, onFilterChange, setControlPanels]);

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
        panels: controlPanel,
      })}
      onLoadComplete={(newControlGroup) => {
        setControlGroup(newControlGroup);
      }}
      query={query}
      timeRange={timeRange}
    />
  );
};
