/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import cloneDeep from 'lodash/cloneDeep';

import {
  AllocateAction,
  PhaseWithAllocationAction,
  SerializedPhase,
} from '../../../../../common/types';

export const serializePhaseWithAllocation = (
  phase: PhaseWithAllocationAction,
  originalPhaseActions: SerializedPhase['actions'] = {}
): SerializedPhase['actions'] => {
  const esPhaseActions: SerializedPhase['actions'] = cloneDeep(originalPhaseActions);

  if (phase.dataTierAllocationType === 'custom') {
    if (phase.selectedNodeAttrs) {
      const [name, value] = phase.selectedNodeAttrs.split(':');
      esPhaseActions.allocate = esPhaseActions.allocate || ({} as AllocateAction);
      esPhaseActions.allocate.require = {
        [name]: value,
      };
    }
    // else leave the policy configuration unchanged.
  } else if (phase.dataTierAllocationType === 'none') {
    esPhaseActions.migrate = { enabled: false };
    if (esPhaseActions.allocate) {
      delete esPhaseActions.allocate;
    }
  } else if (phase.dataTierAllocationType === 'default') {
    if (esPhaseActions.allocate) {
      delete esPhaseActions.allocate.require;
    }
    delete esPhaseActions.migrate;
  }

  return esPhaseActions;
};
