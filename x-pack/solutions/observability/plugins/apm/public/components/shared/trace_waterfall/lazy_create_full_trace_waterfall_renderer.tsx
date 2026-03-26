/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core/public';
import type { FullTraceWaterfallProps } from '@kbn/apm-types';

const LazyFullTraceWaterfallRendererComponent = dynamic(() =>
  import('./full_trace_waterfall_renderer').then((mod) => ({
    default: mod.FullTraceWaterfallRenderer,
  }))
);

export function createLazyFullTraceWaterfallRenderer({ core }: { core: CoreStart }) {
  return (props: FullTraceWaterfallProps) => {
    return <LazyFullTraceWaterfallRendererComponent {...props} core={core} />;
  };
}
