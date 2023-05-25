/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ControlGroupAPI,
  ControlGroupRenderer,
  type ControlGroupInput,
} from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { compareFilters, COMPARE_ALL_OPTIONS, Filter, Query, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { skipWhile, Subscription } from 'rxjs';
import { useControlPanels } from '../../hooks/use_control_panels_url_state';

interface Props {
  dataView: DataView | undefined;
  timeRange: TimeRange;
  filters: Filter[];
  selectedOptions: Filter[];
  query: Query;
  onFiltersChange: (filters: Filter[]) => void;
}

export const ControlsContent: React.FC<Props> = ({
  dataView,
  filters,
  query,
  selectedOptions,
  timeRange,
  onFiltersChange,
}) => {
  const [controlPanels, setControlPanels] = useControlPanels(dataView);
  const inputSubscription = useRef<Subscription>();
  const filterSubscription = useRef<Subscription>();

  const getInitialInput = useCallback(async () => {
    const initialInput: Partial<ControlGroupInput> = {
      id: dataView?.id ?? '',
      viewMode: ViewMode.VIEW,
      chainingSystem: 'HIERARCHICAL',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: controlPanels,
      filters,
      query,
      timeRange,
    };

    return { initialInput };
  }, [controlPanels, dataView?.id, filters, query, timeRange]);

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupAPI) => {
      if (!controlGroup) return;
      inputSubscription.current = controlGroup.onFiltersPublished$
        .pipe(
          skipWhile((newFilters) =>
            compareFilters(selectedOptions, newFilters, COMPARE_ALL_OPTIONS)
          )
        )
        .subscribe((newFilters) => {
          onFiltersChange(newFilters);
        });

      filterSubscription.current = controlGroup
        .getInput$()
        .subscribe(({ panels }) => setControlPanels(panels));
    },
    [onFiltersChange, setControlPanels, selectedOptions]
  );

  useEffect(() => {
    return () => {
      filterSubscription.current?.unsubscribe();
      inputSubscription.current?.unsubscribe();
    };
  }, []);

  return (
    <ControlGroupRenderer
      getCreationOptions={getInitialInput}
      ref={loadCompleteHandler}
      timeRange={timeRange}
      query={query}
      filters={filters}
    />
  );
};
