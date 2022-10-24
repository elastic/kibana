/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Props } from './file_picker';

export type { Props as FilePickerProps };

const FilePickerContainer = lazy(() => import('./file_picker'));

export const FilePicker = (props: Props) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <FilePickerContainer {...props} />
  </Suspense>
);
