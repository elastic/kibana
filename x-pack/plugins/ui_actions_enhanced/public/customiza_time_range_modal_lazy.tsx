/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { CustomizeTimeRangeProps } from './customize_time_range_modal';

const CustomizeTimeRangeModalComponent = React.lazy(() => import('./customize_time_range_modal'));

export const CustomizeTimeRangeModal = (props: CustomizeTimeRangeProps) => {
  return (
    <Suspense fallback={<div />}>
      <CustomizeTimeRangeModalComponent {...props} />
    </Suspense>
  );
};
