/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { FC, lazy, Suspense } from 'react';
import { PanelSpinner } from './panel_spinner';
import type { Props } from './screen_capture_panel_content';
import type { Props as ScreenCaptureModalProps } from './image_exports_modal_content';

const LazyComponent = lazy(() =>
  import('./screen_capture_panel_content').then(({ ScreenCapturePanelContent }) => ({
    default: ScreenCapturePanelContent,
  }))
);

const LazyModalComponent = lazy(() =>
  import('./image_exports_modal_content').then(({ ReportingModalContent }) => ({
    default: ReportingModalContent,
  }))
);

export const ScreenCapturePanelContent: FC<Props> = (props) => {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export const ReportingModalContent: FC<ScreenCaptureModalProps> = (props) => {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <LazyModalComponent {...props} />
    </Suspense>
  );
};
