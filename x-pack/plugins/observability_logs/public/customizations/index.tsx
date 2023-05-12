/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { CustomDataStreamSelectorBuilderProps } from './custom_data_stream_selector';

const LazyCustomDataStreamSelector = lazy(() => import('./custom_data_stream_selector'));

export function createLazyCustomDataStreamSelector({
  core,
  plugins,
  pluginStart,
  stateContainer,
}: CustomDataStreamSelectorBuilderProps) {
  return () => {
    return (
      <Suspense fallback={null}>
        <LazyCustomDataStreamSelector
          core={core}
          plugins={plugins}
          pluginStart={pluginStart}
          stateContainer={stateContainer}
        />
      </Suspense>
    );
  };
}
