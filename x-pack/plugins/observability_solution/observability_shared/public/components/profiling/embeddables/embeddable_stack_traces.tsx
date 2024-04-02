/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TopNType } from '@kbn/profiling-utils';
import { EMBEDDABLE_STACK_TRACES } from '.';
import { ProfilingEmbeddable } from './profiling_embeddable';

interface Props {
  type: TopNType;
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
  onClick: (category: string) => void;
  onChartBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
}

export function EmbeddableStackTraces(props: Props) {
  return <ProfilingEmbeddable {...props} embeddableFactoryId={EMBEDDABLE_STACK_TRACES} />;
}
