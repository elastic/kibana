/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const SyntheticsOverviewEmbeddableLazy = lazy(
  () =>
    import(
      '../apps/synthetics/components/monitors_page/overview/overview/synthetics_overview_embeddable/synthetics_overview_embeddable'
    )
);

export function SyntheticsOverviewEmbeddable(props: { serviceName: string; coreStart: CoreStart }) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <SyntheticsOverviewEmbeddableLazy {...props} />
    </Suspense>
  );
}
