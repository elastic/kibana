/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Suspense } from 'react';

import type { AucRocChartViewProps } from './auc_roc_chart_view';

const AucRocChartLazy = React.lazy(() => import('./auc_roc_chart_view'));

export const AucRocChart: FC<AucRocChartViewProps> = (props) => (
  <Suspense fallback={null}>
    <AucRocChartLazy {...props} />
  </Suspense>
);
