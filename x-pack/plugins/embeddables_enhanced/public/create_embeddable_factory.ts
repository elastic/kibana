/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
  IContainer,
} from '../../../../src/plugins/embeddable/public';
import { SavedObjectAttributes } from '../../../../src/core/types';

type CreateEmbeddableFactoryFn = <
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  T extends SavedObjectAttributes = SavedObjectAttributes
>(
  def: EmbeddableFactoryDefinition<I, O, E, T>
) => EmbeddableFactory<I, O, E, T>;

export const getCreateEmbeddableFactory = (): CreateEmbeddableFactoryFn => <
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  T extends SavedObjectAttributes = SavedObjectAttributes
>(
  def: EmbeddableFactoryDefinition<I, O, E, T>
): EmbeddableFactory<I, O, E, T> => {
  const factory: EmbeddableFactory<I, O, E, T> = {
    isContainerType: false,
    canCreateNew: () => true,
    getDefaultInput: () => ({}),
    getExplicitInput: () => Promise.resolve({}),
    createFromSavedObject: (savedObjectId: string, input: Partial<I>, parent?: IContainer) => {
      throw new Error(`Creation from saved object not supported by type ${def.type}`);
    },
    ...def,
    create: async (input: I, parent?: IContainer) => {
      const embeddable = await def.create(input, parent);
      return embeddable;
    },
  };
  return factory;
};
