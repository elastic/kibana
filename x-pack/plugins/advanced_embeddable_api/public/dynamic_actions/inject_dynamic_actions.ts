/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  actionRegistry,
  Embeddable,
  Container,
  Action,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { hasDynamicActions } from './actionable_embeddable';
import { actionFactoryRegistry } from './action_factory_registry';

const baseGetActionsForTrigger = actionRegistry.getActionsForTrigger;

actionRegistry.getActionsForTrigger = async (
  id: string,
  context: { embeddable: Embeddable; container?: Container }
) => {
  const actions: Action[] = await baseGetActionsForTrigger(id, context);
  if (hasDynamicActions(context.embeddable)) {
    context.embeddable.getInput().dynamicActions.forEach(dynamicAction => {
      if (dynamicAction.triggerId === id) {
        const dynamicActionFactory = actionFactoryRegistry.getFactoryById(dynamicAction.type);
        actions.push(dynamicActionFactory.create(dynamicAction));
      }
    });
  }
  return actions;
};
