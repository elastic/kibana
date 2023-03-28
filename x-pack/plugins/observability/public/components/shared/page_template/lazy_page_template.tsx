/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ObservabilityPageTemplateDependencies,
  WrappedPageTemplateProps,
} from './page_template';

export const LazyObservabilityPageTemplate = React.lazy(() => import('./page_template'));

export type LazyObservabilityPageTemplateProps = WrappedPageTemplateProps;

export function createLazyObservabilityPageTemplate(
  injectedDeps: ObservabilityPageTemplateDependencies
) {
  return (pageTemplateProps: LazyObservabilityPageTemplateProps) => (
    <React.Suspense fallback={null}>
      <LazyObservabilityPageTemplate {...pageTemplateProps} {...injectedDeps} />
    </React.Suspense>
  );
}
