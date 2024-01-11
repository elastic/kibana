/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { EmbeddableProps } from '../apps/synthetics/components/monitors_page/monitors_embeddable/monitor_screenshot_selector';

const MonitorScreenshotSelectorEmbeddableLazy = lazy(
  () =>
    import(
      '../apps/synthetics/components/monitors_page/monitors_embeddable/monitor_screenshot_selector'
    )
);

export type MonitorScreenshotEmbeddableProps = EmbeddableProps;
export function MonitorScreenshotEmbeddable(props: MonitorScreenshotEmbeddableProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <MonitorScreenshotSelectorEmbeddableLazy {...props} />
    </Suspense>
  );
}
