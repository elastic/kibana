/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable } from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { hasDynamicActions, ActionableEmbeddable } from './actionable_embeddable';

export async function deleteAction(id: string, embeddable: Embeddable) {
  const existingDynamicActions = hasDynamicActions(embeddable)
    ? embeddable.getInput().dynamicActions
    : [];

  const filteredActions = existingDynamicActions.filter(serialized => serialized.id !== id);
  (embeddable as ActionableEmbeddable).updateInput({ dynamicActions: filteredActions });
}
