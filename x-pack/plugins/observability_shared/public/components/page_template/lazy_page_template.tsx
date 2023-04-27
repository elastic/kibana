/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import type {
  ObservabilityPageTemplateDependencies,
  WrappedPageTemplateProps,
} from './page_template';

export const LazyObservabilityPageTemplate = React.lazy(() => import('./page_template'));

export type LazyObservabilityPageTemplateProps = WrappedPageTemplateProps;

export function createLazyObservabilityPageTemplate({
  getChromeStyle$,
  ...injectedDeps
}: ObservabilityPageTemplateDependencies) {
  return (pageTemplateProps: LazyObservabilityPageTemplateProps) => {
    const chromeStyle = useObservable(getChromeStyle$());
    const { showSolutionNav: showSolutionNavProp, ...props } = pageTemplateProps;
    let showSolutionNav = showSolutionNavProp;

    if (chromeStyle === 'project') {
      showSolutionNav = false;
    }

    return (
      <React.Suspense fallback={null}>
        <LazyObservabilityPageTemplate {...{ ...props, showSolutionNav }} {...injectedDeps} />
      </React.Suspense>
    );
  };
}
