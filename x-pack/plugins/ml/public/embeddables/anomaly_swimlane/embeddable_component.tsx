/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableRoot,
  useEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { EuiLoadingChart } from '@elastic/eui';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, AnomalySwimlaneEmbeddableInput } from '../..';
import type { MlStartDependencies } from '../../plugin';

export function getEmbeddableComponent(core: CoreStart, plugins: MlStartDependencies) {
  const { embeddable: embeddableStart } = plugins;
  const factory = embeddableStart.getEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE)!;
  return (props: AnomalySwimlaneEmbeddableInput) => {
    return <EmbeddableRootWrapper factory={factory} input={props} />;
  };
}

const EmbeddableRootWrapper: FC<{
  factory: EmbeddableFactory<EmbeddableInput, EmbeddableOutput>;
  input: AnomalySwimlaneEmbeddableInput;
}> = ({ factory, input }) => {
  const [embeddable, loading, error] = useEmbeddableFactory({ factory, input });
  if (loading) {
    return <EuiLoadingChart />;
  }
  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
};
