/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EMBEDDABLE_THREADS } from '.';
import { ProfilingEmbeddable } from './profiling_embeddable';

interface Props {
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
}

export function EmbeddableThreads(props: Props) {
  return <ProfilingEmbeddable {...props} embeddableFactoryId={EMBEDDABLE_THREADS} />;
}
