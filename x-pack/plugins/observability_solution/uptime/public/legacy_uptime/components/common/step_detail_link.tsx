/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactRouterEuiButtonEmpty } from './react_router_helpers';

interface StepDetailLinkProps {
  children: React.ReactNode;
  /**
   * The ID of the check group (the journey run)
   */
  checkGroupId: string;
  /**
   * The index of the step
   */
  stepIndex: number;
}

export const StepDetailLink = ({ children, checkGroupId, stepIndex }: StepDetailLinkProps) => {
  const to = `/journey/${checkGroupId}/step/${stepIndex}`;

  return (
    <ReactRouterEuiButtonEmpty data-test-subj={`step-detail-link`} to={to}>
      {children}
    </ReactRouterEuiButtonEmpty>
  );
};
