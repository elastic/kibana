/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const MonitorScreenshotSelectorEmbeddableLazy = lazy(
  () =>
    import(
      '../apps/synthetics/components/monitors_page/monitors_embeddable/monitor_screenshot_selector'
    )
);

export function MonitorScreenshotEmbeddable(props: { coreStart: CoreStart }) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <MonitorScreenshotSelectorEmbeddableLazy {...props} />
    </Suspense>
  );
}
