/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { VisualizationActionsProps } from '../types';

export const VisualizationActions = (props: VisualizationActionsProps) => {
  const { title, ...testProps } = props;
  return (
    <div data-test-subj="visualizationActions" {...testProps}>
      {title}
    </div>
  );
};
