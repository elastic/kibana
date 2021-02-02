/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Suspense } from 'react';

import type { ScatterplotMatrixViewProps } from './scatterplot_matrix_view';
import { ScatterplotMatrixLoading } from './scatterplot_matrix_loading';

const ScatterplotMatrixLazy = React.lazy(() => import('./scatterplot_matrix_view'));

export const ScatterplotMatrix: FC<ScatterplotMatrixViewProps> = (props) => (
  <Suspense fallback={<ScatterplotMatrixLoading />}>
    <ScatterplotMatrixLazy {...props} />
  </Suspense>
);
