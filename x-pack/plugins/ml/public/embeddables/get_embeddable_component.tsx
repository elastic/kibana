/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingChart } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { EmbeddableFactory, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { EmbeddableRoot, useEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import React from 'react';
import type { MlStartDependencies } from '../plugin';
import type { MlEmbeddableTypes } from './constants';
import type { MappedEmbeddableTypeOf } from './types';

/**
 * Gets an instance of an embeddable component of requested type.
 * @param embeddableType
 * @param core
 * @param plugins
 */
export function getEmbeddableComponent<EmbeddableType extends MlEmbeddableTypes>(
  embeddableType: EmbeddableType,
  core: CoreStart,
  plugins: MlStartDependencies
) {
  const { embeddable: embeddableStart } = plugins;

  const factory =
    embeddableStart.getEmbeddableFactory<MappedEmbeddableTypeOf<EmbeddableType>>(embeddableType);

  if (!factory) {
    throw new Error(`Embeddable type "${embeddableType}" has not been registered.`);
  }

  return React.memo((props: MappedEmbeddableTypeOf<EmbeddableType>) => {
    return <EmbeddableRootWrapper factory={factory} input={props} />;
  });
}

interface EmbeddableRootWrapperProps<TMlEmbeddableInput extends EmbeddableInput> {
  factory: EmbeddableFactory<TMlEmbeddableInput>;
  input: TMlEmbeddableInput;
}

const EmbeddableRootWrapper = <TMlEmbeddableInput extends EmbeddableInput>({
  factory,
  input,
}: EmbeddableRootWrapperProps<TMlEmbeddableInput>) => {
  const [embeddable, loading, error] = useEmbeddableFactory({ factory, input });
  if (loading) {
    return <EuiLoadingChart />;
  }
  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
};
