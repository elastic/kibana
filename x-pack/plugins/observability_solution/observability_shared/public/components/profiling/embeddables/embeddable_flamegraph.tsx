/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import { ProfilingEmbeddable } from './profiling_embeddable';
import { EMBEDDABLE_FLAMEGRAPH } from '.';

interface Props {
  data?: BaseFlameGraph;
  isLoading: boolean;
  height?: string;
}

export function EmbeddableFlamegraph(props: Props) {
  return <ProfilingEmbeddable {...props} embeddableFactoryId={EMBEDDABLE_FLAMEGRAPH} />;
}
