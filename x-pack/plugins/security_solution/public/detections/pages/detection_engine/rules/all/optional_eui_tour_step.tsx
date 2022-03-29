/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiTourStepProps, EuiTourStep, DistributiveOmit } from '@elastic/eui';

/**
 * This component can be used for tour steps, when tour step is optional
 * If stepProps are not supplied, step will not be rendered, only children component will be
 */
export const OptionalEuiTourStep: FC<{
  stepProps: DistributiveOmit<EuiTourStepProps, 'anchor'> | undefined;
}> = ({ children, stepProps }) => {
  if (!stepProps) {
    return <>{children}</>;
  }

  return (
    <EuiTourStep {...stepProps}>
      <>{children}</>
    </EuiTourStep>
  );
};
