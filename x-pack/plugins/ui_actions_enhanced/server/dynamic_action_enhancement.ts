/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancementRegistryDefinition } from '../../../../src/plugins/embeddable/server';
import { SavedObjectReference } from '../../../../src/core/types';
import { DynamicActionsState, SerializedEvent } from './types';
import { AdvancedUiActionsServerPlugin } from './plugin';
import { SerializableState } from '../../../../src/plugins/kibana_utils/common';

export const dynamicActionEnhancement = (
  uiActionsEnhanced: AdvancedUiActionsServerPlugin
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (state: SerializableState, telemetry: Record<string, any>) => {
      let telemetryData = telemetry;
      (state as DynamicActionsState).events.forEach((event: SerializedEvent) => {
        if (uiActionsEnhanced.getActionFactory(event.action.factoryId)) {
          telemetryData = uiActionsEnhanced
            .getActionFactory(event.action.factoryId)!
            .telemetry(event, telemetryData);
        }
      });
      return telemetryData;
    },
    extract: (state: SerializableState) => {
      const references: SavedObjectReference[] = [];
      const newState: DynamicActionsState = {
        events: (state as DynamicActionsState).events.map((event: SerializedEvent) => {
          const result = uiActionsEnhanced.getActionFactory(event.action.factoryId)
            ? uiActionsEnhanced.getActionFactory(event.action.factoryId)!.extract(event)
            : {
                state: event,
                references: [],
              };
          result.references.forEach((r) => references.push(r));
          return result.state;
        }),
      };
      return { state: newState, references };
    },
    inject: (state: SerializableState, references: SavedObjectReference[]) => {
      return {
        events: (state as DynamicActionsState).events.map((event: SerializedEvent) => {
          return uiActionsEnhanced.getActionFactory(event.action.factoryId)
            ? uiActionsEnhanced.getActionFactory(event.action.factoryId)!.inject(event, references)
            : event;
        }),
      } as DynamicActionsState;
    },
  } as EnhancementRegistryDefinition;
};
