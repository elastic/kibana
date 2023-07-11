/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { VisualizationActionsProps } from '../types';

export const VisualizationActions = jest.fn((props: VisualizationActionsProps) => {
  const { title, className } = props;

  return (
    <div data-test-subj="visualizationActions" className={className}>
      {title}
    </div>
  );
});
