/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, useMemo } from 'react';
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Filter, TimeRange } from '@kbn/es-query';
import { LazyControlsRenderer } from './lazy_controls_renderer';

interface Props {
  timeRange: TimeRange;
  dataViewId: string;
  filters: Filter[];
  setControlFilters: Dispatch<SetStateAction<Filter[]>>;
  query: {
    language: string;
    query: string;
  };
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const ControlsContent: React.FC<Props> = ({
  timeRange,
  dataViewId,
  query,
  filters,
  setControlFilters,
}) => {
  const embeddableInput: ControlGroupInput = useMemo(() => {
    return {
      id: dataViewId,
      type: CONTROL_GROUP_TYPE,
      timeRange: {
        from: timeRange.from,
        to: timeRange.to,
      },
      refreshConfig: REFRESH_CONFIG,
      viewMode: ViewMode.VIEW,
      filters,
      query,
      chainingSystem: 'HIERARCHICAL',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: {
        osPanel: {
          order: 0,
          width: 'small',
          grow: true,
          type: 'optionsListControl',
          explicitInput: {
            id: 'osPanel',
            dataViewId,
            fieldName: 'host.os.name',
            title: 'Operating System',
          },
        },
        cloudProviderPanel: {
          order: 1,
          width: 'small',
          grow: true,
          type: 'optionsListControl',
          explicitInput: {
            id: 'cloudProviderPanel',
            dataViewId,
            fieldName: 'cloud.provider',
            title: 'Cloud Provider',
          },
        },
      },
    };
  }, [dataViewId, timeRange.to, timeRange.from, filters, query]);

  return (
    <LazyControlsRenderer
      input={embeddableInput}
      onEmbeddableLoad={(controlGroup) => {
        controlGroup.onFiltersPublished$.subscribe((newFilters) => setControlFilters(newFilters));
      }}
    />
  );
};
