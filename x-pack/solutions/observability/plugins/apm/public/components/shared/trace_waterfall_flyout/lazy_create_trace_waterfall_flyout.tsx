/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityTraceWaterfallFlyoutFeature } from '@kbn/discover-shared-plugin/public';

type TraceWaterfallFlyoutFeatureProps = Parameters<
  ObservabilityTraceWaterfallFlyoutFeature['render']
>[0];

const LazyTraceWaterfallFlyoutComponent = dynamic(() =>
  import('.').then((mod) => ({
    default: mod.TraceWaterfallFlyout,
  }))
);

export function createLazyTraceWaterfallFlyout({ core }: { core: CoreStart }) {
  return (props: TraceWaterfallFlyoutFeatureProps) => (
    <LazyTraceWaterfallFlyoutComponent {...props} core={core} />
  );
}
