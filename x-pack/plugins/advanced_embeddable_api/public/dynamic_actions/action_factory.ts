/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Embeddable,
  Container,
  Trigger,
  Action,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ActionSavedObject, SerializedDynamicAction } from './action_saved_object';
import { DynamicAction } from './dynamic_action';

export interface CreateOptions {
  embeddable: Embeddable;
  container: Container;
}

export abstract class ActionFactory {
  public readonly id: string;
  public readonly title: string;

  constructor({ id, title }: { id: string; title: string }) {
    this.id = id;
    this.title = title;
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: Embeddable;
    container: Container;
  }): Promise<boolean> {
    return Promise.resolve(true);
  }

  public allowAddingToTrigger(trigger: Trigger) {
    return true;
  }

  public showParameterization() {
    return true;
  }

  public abstract renderEditor(
    dom: React.ReactNode,
    configuration: string,
    onChange: (config: string) => void
  ): void;

  public abstract create(serializedData: SerializedDynamicAction): DynamicAction;

  public abstract async createNew(): Promise<DynamicAction>;
}
