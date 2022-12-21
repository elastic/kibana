/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import { SerializedAction, SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common';
import { DrilldownConfig } from './types';

type DashboardDrilldownPersistableState = PersistableStateService<SerializedEvent>;

const generateRefName = (state: SerializedEvent, id: string) =>
  `drilldown:${id}:${state.eventId}:dashboardId`;

const injectDashboardId = (state: SerializedEvent, dashboardId: string): SerializedEvent => {
  return {
    ...state,
    action: {
      ...state.action,
      config: {
        ...state.action.config,
        dashboardId,
      },
    },
  };
};

export const createInject = ({
  drilldownId,
}: {
  drilldownId: string;
}): DashboardDrilldownPersistableState['inject'] => {
  return (state: SerializedEvent, references: SavedObjectReference[]) => {
    const action = state.action as SerializedAction<DrilldownConfig>;
    const refName = generateRefName(state, drilldownId);
    const ref = references.find((r) => r.name === refName);
    if (!ref) return state;
    if (ref.id && ref.id === action.config.dashboardId) return state;
    return injectDashboardId(state, ref.id);
  };
};

export const createExtract = ({
  drilldownId,
}: {
  drilldownId: string;
}): DashboardDrilldownPersistableState['extract'] => {
  return (state: SerializedEvent) => {
    const action = state.action as SerializedAction<DrilldownConfig>;
    const references: SavedObjectReference[] = action.config.dashboardId
      ? [
          {
            name: generateRefName(state, drilldownId),
            type: 'dashboard',
            id: action.config.dashboardId,
          },
        ]
      : [];

    const { dashboardId, ...restOfConfig } = action.config;

    return {
      state: {
        ...state,
        action: {
          ...state.action,
          config: restOfConfig,
        } as unknown as SerializedAction,
      },
      references,
    };
  };
};
