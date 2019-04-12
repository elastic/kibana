/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable } from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { DynamicAction } from './dynamic_action';
import { actionFactoryRegistry } from './action_factory_registry';
import { hasDynamicActions } from './actionable_embeddable';

export function getAction(id: string, embeddable: Embeddable): DynamicAction | undefined {
  const existingDynamicActions = hasDynamicActions(embeddable)
    ? embeddable.getInput().dynamicActions
    : [];

  const serializedAction = existingDynamicActions.find(serialized => serialized.id === id);

  if (!serializedAction) {
    return undefined;
  }

  const factory = actionFactoryRegistry.getFactoryById(serializedAction.type);

  return factory.create(serializedAction);
}
