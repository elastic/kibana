/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ControlGroupInput } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Filter, TimeRange } from '@kbn/es-query';
import { LazyControlsRenderer } from './lazy_controls_renderer';
import { useControlPanels } from '../hooks/use_control_panels_url_state';

interface Props {
  timeRange: TimeRange;
  dataViewId: string;
  filters: Filter[];
  query: {
    language: string;
    query: string;
  };
  setPanelFilters: React.Dispatch<React.SetStateAction<null | Filter[]>>;
}

export const ControlsContent: React.FC<Props> = ({
  timeRange,
  dataViewId,
  query,
  filters,
  setPanelFilters,
}) => {
  const { setControlPanels, controlPanel } = useControlPanels(dataViewId);

  return (
    <LazyControlsRenderer
      getCreationOptions={async ({ addDataControlFromField }) => {
        const input: Partial<ControlGroupInput> = {
          id: dataViewId,
          timeRange: {
            from: timeRange.from,
            to: timeRange.to,
          },
          viewMode: ViewMode.VIEW,
          filters,
          query,
          chainingSystem: 'HIERARCHICAL',
          controlStyle: 'oneLine',
          defaultControlWidth: 'small',
          panels: controlPanel,
        };

        return input;
      }}
      onEmbeddableLoad={(controlGroup) => {
        controlGroup.onFiltersPublished$.subscribe((newFilters) => {
          setPanelFilters([...newFilters]);
        });
        controlGroup.getInput$().subscribe(({ panels, filters: currentFilters }) => {
          setControlPanels(panels);
          if (currentFilters?.length === 0) {
            setPanelFilters([]);
          }
        });
      }}
    />
  );
};
