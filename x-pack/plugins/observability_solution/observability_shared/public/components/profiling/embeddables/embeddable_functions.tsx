/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopNFunctions } from '@kbn/profiling-utils';
import React from 'react';
import { ProfilingEmbeddable, ProfilingEmbeddableProps } from './profiling_embeddable';
import { EMBEDDABLE_FUNCTIONS } from '.';

type Props = Omit<ProfilingEmbeddableProps<TopNFunctions>, 'embeddableFactoryId'> & {
  rangeFrom: number;
  rangeTo: number;
};

export function EmbeddableFunctions(props: Props) {
  return <ProfilingEmbeddable {...props} embeddableFactoryId={EMBEDDABLE_FUNCTIONS} />;
}
