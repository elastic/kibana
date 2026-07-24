/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import {
  ControlGroupRenderer,
  type ControlGroupCreationOptions,
  type ControlGroupRendererApi,
  type ControlGroupRuntimeState,
  type ControlGroupStateBuilder,
} from '@kbn/control-group-renderer';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  SERVICE_MAP_CONTROLS_CONFIG,
  type ServiceMapControlConfig,
} from './service_map_control_panels_config';

interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query;
  onFiltersChange: (filters: Filter[]) => void;
  /**
   * Per-field initial selections keyed by field_name (e.g. `{ 'service.environment': ['production'] }`).
   * Captured in a ref on mount so Controls don't re-initialise when the prop reference changes.
   */
  initialSelections?: Record<string, string[]>;
  controlsConfig?: ServiceMapControlConfig[];
}

/**
 * Renders Controls API dropdown filters for the service map.
 * Subscribes to `appliedFilters$` and propagates changes via `onFiltersChange`.
 */
export function ServiceMapControls({
  dataView,
  timeRange,
  filters,
  query,
  onFiltersChange,
  initialSelections,
  controlsConfig = SERVICE_MAP_CONTROLS_CONFIG,
}: Props) {
  const subscriptions = useRef(new Subscription());
  // Capture initial selections on mount only — using a ref prevents getCreationOptions
  // from re-running (and Controls from re-initialising) when the prop reference changes.
  const initialSelectionsRef = useRef(initialSelections);
  const controlsConfigRef = useRef(controlsConfig);

  const getCreationOptions = useCallback(
    async (
      _initialState: ControlGroupRuntimeState,
      builder: ControlGroupStateBuilder
    ): Promise<Partial<ControlGroupCreationOptions>> => {
      const state: Partial<ControlGroupRuntimeState> = {};
      for (const config of controlsConfigRef.current) {
        builder.addOptionsListControl(state, {
          data_view_id: dataView.id ?? '',
          field_name: config.field_name,
          title: config.title,
          width: config.width,
          grow: config.grow,
          selected_options: initialSelectionsRef.current?.[config.field_name] ?? [],
          single_select: config.single_select,
        });
      }
      return { initialState: state as ControlGroupRuntimeState };
    },
    // Re-create only when the data view changes so controls re-initialize with the correct index.
    [dataView.id]
  );

  const onApiAvailable = useCallback(
    (controlGroup: ControlGroupRendererApi) => {
      subscriptions.current.unsubscribe();
      subscriptions.current = new Subscription();

      subscriptions.current.add(
        controlGroup.appliedFilters$.subscribe((newFilters = []) => {
          onFiltersChange(newFilters);
        })
      );
    },
    [onFiltersChange]
  );

  useEffect(() => {
    return () => {
      subscriptions.current.unsubscribe();
    };
  }, []);

  return (
    <ControlGroupRenderer
      getCreationOptions={getCreationOptions}
      onApiAvailable={onApiAvailable}
      timeRange={timeRange}
      query={query}
      filters={filters}
      compressed
    />
  );
}
