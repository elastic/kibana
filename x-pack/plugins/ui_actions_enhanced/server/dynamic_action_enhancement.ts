/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancementRegistryDefinition } from '../../../../src/plugins/embeddable/server';
import { SavedObjectReference } from '../../../../src/core/types';
import { ActionFactory, DynamicActionsState, SerializedEvent } from './types';
import { SerializableState } from '../../../../src/plugins/kibana_utils/common';
import { dynamicActionsCollector } from './telemetry/dynamic_actions_collector';
import { dynamicActionFactoriesCollector } from './telemetry/dynamic_action_factories_collector';

export const dynamicActionEnhancement = (
  getActionFactory: (id: string) => undefined | ActionFactory
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (serializableState: SerializableState, stats: Record<string, any>) => {
      const state = serializableState as DynamicActionsState;
      stats = dynamicActionsCollector(state, stats);
      stats = dynamicActionFactoriesCollector(getActionFactory, state, stats);

      return stats;
    },
    extract: (state: SerializableState) => {
      const references: SavedObjectReference[] = [];
      const newState: DynamicActionsState = {
        events: (state as DynamicActionsState).events.map((event: SerializedEvent) => {
          const factory = getActionFactory(event.action.factoryId);
          const result = factory
            ? factory.extract(event)
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
          const factory = getActionFactory(event.action.factoryId);
          return factory ? factory.inject(event, references) : event;
        }),
      } as DynamicActionsState;
    },
  } as EnhancementRegistryDefinition;
};
