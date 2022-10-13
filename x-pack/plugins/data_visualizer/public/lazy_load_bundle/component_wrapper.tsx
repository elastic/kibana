/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

const FileDataVisualizerComponent = React.lazy(
  () => import('../application/file_data_visualizer/file_data_visualizer')
);

export const FileDataVisualizerWrapper: FC = () => {
  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerComponent />
    </React.Suspense>
  );
};
