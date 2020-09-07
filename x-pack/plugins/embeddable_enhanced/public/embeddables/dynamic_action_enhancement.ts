/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancementRegistryDefinition } from '../../../../../src/plugins/embeddable/public';
import { SavedObjectReference } from '../../../../../src/core/types';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import { SerializableState } from '../../../../../src/plugins/kibana_utils/common';
import { StartDependencies } from '../plugin';
import { DynamicActionsState } from '../../../ui_actions_enhanced/public';

export const dynamicActionEnhancement = (
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (state: SerializableState) => {
      return start().plugins.uiActionsEnhanced.telemetry(state as DynamicActionsState);
    },
    extract: (state: SerializableState) => {
      return start().plugins.uiActionsEnhanced.extract(state as DynamicActionsState);
    },
    inject: (state: SerializableState, references: SavedObjectReference[]) => {
      return start().plugins.uiActionsEnhanced.inject(state as DynamicActionsState, references);
    },
  } as EnhancementRegistryDefinition<SerializableState>;
};
