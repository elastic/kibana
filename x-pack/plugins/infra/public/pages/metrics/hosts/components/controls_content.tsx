/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ControlGroupContainer, type ControlGroupInput } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { tap, Subscription, map, debounceTime } from 'rxjs';
import { LazyControlsRenderer } from './lazy_controls_renderer';
import { useControlPanels } from '../hooks/use_control_panels_url_state';

interface Props {
  timeRange: TimeRange;
  dataView: DataView;
  onFiltersChanged: (filters: Filter[]) => void;
}

export const ControlsContent: React.FC<Props> = ({ timeRange, dataView, onFiltersChanged }) => {
  const [controlPanels, setControlPanels] = useControlPanels(dataView);
  const inputSubscription = useRef<Subscription>();
  const filterSubscription = useRef<Subscription>();

  const getInitialInput = useCallback(async () => {
    const initialInput: Partial<ControlGroupInput> = {
      id: dataView.id ?? '',
      viewMode: ViewMode.VIEW,
      chainingSystem: 'HIERARCHICAL',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: controlPanels,
      timeRange,
      ignoreParentSettings: {
        ignoreValidations: true,
      },
    };

    return { initialInput };
  }, [controlPanels, dataView.id, timeRange]);

  const loadCompleteHandler = (controlGroup: ControlGroupContainer) => {
    inputSubscription.current = controlGroup.onFiltersPublished$
      .pipe(
        debounceTime(500),
        map((newFilters) =>
          newFilters.sort((a, b) => a.meta.key?.localeCompare(b.meta.key ?? '') ?? 0)
        ),
        tap((sortedFilters) => onFiltersChanged(sortedFilters))
      )
      .subscribe();

    filterSubscription.current = controlGroup
      .getInput$()
      .pipe(tap(({ panels }) => setControlPanels(panels)))
      .subscribe();
  };

  useEffect(() => {
    return () => {
      filterSubscription.current?.unsubscribe();
      inputSubscription.current?.unsubscribe();
    };
  }, []);

  return (
    <LazyControlsRenderer
      getCreationOptions={getInitialInput}
      onLoadComplete={loadCompleteHandler}
      timeRange={timeRange}
    />
  );
};
