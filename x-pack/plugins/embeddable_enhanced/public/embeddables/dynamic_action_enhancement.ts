/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnhancementRegistryDefinition } from '../../../../../src/plugins/embeddable/public';
import { SavedObjectReference } from '../../../../../src/core/types';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import { StartDependencies } from '../plugin';
import { SerializableState } from '../../../../../src/plugins/kibana_utils/common';

export interface DynamicActionEnhancementDeps {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export const dynamicActionEnhancement = (start) => {
  return {
    id: 'dynamicActions',
    telemetry: (state: SerializableState) => {
      return start.uiActionsEnhanced.telemetry(state);
    },
    extract: (state: SerializableState) => {
      return start.uiActionsEnhanced.extract(state);
    },
    inject: (state: SerializableState, refereces: SavedObjectReference[]) => {
      return start.uiActionsEnhanced.inject(state, references);
    },
  };
};
