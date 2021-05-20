/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { SaveModalContainerProps } from '../save_modal_container';
const SaveModal = React.lazy(() => import('../save_modal_container'));

export const SavedModalLazy = (props: SaveModalContainerProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <SaveModal {...props} />
    </Suspense>
  );
};
