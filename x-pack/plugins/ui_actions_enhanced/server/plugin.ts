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
  registerActionFactory: any;
}

export type StartContract = void;

interface SetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
}

export class AdvancedUiActionsPublicPlugin
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

  public readonly telemetry = (state: DynamicActionsState, telemetry: Record<string, any> = {}) => {
    state.events.forEach((event: SerializedEvent) => {
      if (this.actionFactories.has(event.action.factoryId)) {
        this.actionFactories.get(event.action.factoryId)!.telemetry(event, telemetry);
      }
    });
    return telemetry;
  };

  public readonly extract = (state: DynamicActionsState) => {
    const references: SavedObjectReference[] = [];
    const newState = {
      events: state.events.map((event: SerializedEvent) => {
        const result = this.actionFactories.has(event.action.factoryId)
          ? this.actionFactories.get(event.action.factoryId)!.extract(event)
          : {
              state: event,
              references: [],
            };
        result.references.forEach((r) => references.push(r));
        return result.state;
      }),
    };
    return { state: newState, references };
  };

  public readonly inject = (state: DynamicActionsState, references: SavedObjectReference[]) => {
    return {
      events: state.events.map((event: SerializedEvent) => {
        return this.actionFactories.has(event.action.factoryId)
          ? this.actionFactories.get(event.action.factoryId)!.inject(event, references)
          : event;
      }),
    };
  };
}
