/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { lazy, Suspense, FC } from 'react';
import { PanelSpinner } from './panel_spinner';
import type { Props } from './screen_capture_panel_content';

const LazyComponent = lazy(() =>
  import('./screen_capture_panel_content').then(({ ScreenCapturePanelContent }) => ({
    default: ScreenCapturePanelContent,
  }))
);

export const ScreenCapturePanelContent: FC<Props> = (props) => {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};
