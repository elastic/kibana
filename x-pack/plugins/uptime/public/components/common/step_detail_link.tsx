/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { ReactRouterEuiButtonEmpty } from './react_router_helpers';

interface StepDetailLinkProps {
  /**
   * The ID of the check group (the journey run)
   */
  checkGroupId: string;
  /**
   * The index of the step
   */
  stepIndex: number;
}

export const StepDetailLink: FC<StepDetailLinkProps> = ({ children, checkGroupId, stepIndex }) => {
  const to = `/journey/${checkGroupId}/step/${stepIndex}`;

  return (
    <ReactRouterEuiButtonEmpty
      data-test-subj={`step-detail-link`}
      to={to}
      size="s"
      iconType="apmTrace"
      iconSide="right"
    >
      {children}
    </ReactRouterEuiButtonEmpty>
  );
};
