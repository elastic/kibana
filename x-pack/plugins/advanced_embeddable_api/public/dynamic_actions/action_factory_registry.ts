/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Embeddable,
  Container,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ActionFactory } from './action_factory';

class ActionFactoryRegistry {
  private actionFactories: { [key: string]: ActionFactory } = {};

  public registerActionFactory(action: ActionFactory) {
    this.actionFactories[action.id] = action;
  }

  public getFactoryById(id: string) {
    return this.actionFactories[id];
  }

  public getCompatibleFactories(context: { embeddable: Embeddable; container: Container }) {
    return Object.values(this.actionFactories).filter((actionFactory: ActionFactory) => {
      return actionFactory.isCompatible(context);
    });
  }

  public getFactories() {
    return this.actionFactories;
  }
}

export const actionFactoryRegistry = new ActionFactoryRegistry();
