/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { identity } from 'lodash';
import { CoreSetup, Plugin, SavedObjectReference } from '../../../../src/core/server';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/server';
import { dynamicActionEnhancement } from './dynamic_action_enhancement';
import {
  ActionFactoryRegistry,
  SerializedEvent,
  ActionFactoryDefinition,
  DynamicActionsState,
} from './types';

export interface SetupContract {
  registerActionFactory: (definition: ActionFactoryDefinition) => void;
}

export type StartContract = void;

interface SetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
}

export class AdvancedUiActionsServerPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies> {
  protected readonly actionFactories: ActionFactoryRegistry = new Map();

  constructor() {}

  public setup(core: CoreSetup, { embeddable }: SetupDependencies) {
    embeddable.registerEnhancement(dynamicActionEnhancement(this));

    return {
      registerActionFactory: this.registerActionFactory,
    };
  }

  public start() {}

  public stop() {}

  /**
   * Register an action factory. Action factories are used to configure and
   * serialize/deserialize dynamic actions.
   */
  public readonly registerActionFactory = (definition: ActionFactoryDefinition) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    this.actionFactories.set(definition.id, {
      id: definition.id,
      telemetry: definition.telemetry || (() => ({})),
      inject: definition.inject || identity,
      extract:
        definition.extract ||
        ((state: SerializedEvent) => {
          return { state, references: [] };
        }),
      migrations: definition.migrations || {},
    });
  };

  public readonly getActionFactory = (actionFactoryId: string) => {
    const actionFactory = this.actionFactories.get(actionFactoryId);
    return actionFactory;
  };
}
