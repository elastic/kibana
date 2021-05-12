/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
  IEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';
import { APP_ICON, APP_ID, APP_NAME } from './constants';

export abstract class APMEmbeddableFactory<
  I extends EmbeddableInput,
  O extends EmbeddableOutput,
  E extends IEmbeddable<I, O>
> implements EmbeddableFactoryDefinition<I, O, E> {
  constructor(
    public readonly type: string,
    public readonly displayName: string
  ) {}

  public readonly grouping = [
    {
      id: APP_ID,
      getDisplayName: () => APP_NAME,
      getIconType: () => APP_ICON,
    },
  ];

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return this.displayName;
  }
  public abstract create(initialInput: I, parent?: IContainer): Promise<E>;
}
