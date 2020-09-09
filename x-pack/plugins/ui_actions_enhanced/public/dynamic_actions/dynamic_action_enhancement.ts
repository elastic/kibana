/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancementRegistryDefinition } from '../../../../../src/plugins/embeddable/public';
import { SavedObjectReference } from '../../../../../src/core/types';
import { SerializableState } from '../../../../../src/plugins/kibana_utils/common';
import { DynamicActionsState } from '../../../ui_actions_enhanced/public';
import { UiActionsServiceEnhancements } from '../services';

export const dynamicActionEnhancement = (
  uiActionsEnhanced: UiActionsServiceEnhancements
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (state: SerializableState, telemetryData: Record<string, any>) => {
      return uiActionsEnhanced.telemetry(state as DynamicActionsState, telemetryData);
    },
    extract: (state: SerializableState) => {
      return uiActionsEnhanced.extract(state as DynamicActionsState);
    },
    inject: (state: SerializableState, references: SavedObjectReference[]) => {
      return uiActionsEnhanced.inject(state as DynamicActionsState, references);
    },
  } as EnhancementRegistryDefinition<SerializableState>;
};
