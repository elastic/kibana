/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FailedStepsApiResponse } from '../../../../../common/runtime_types/ping/synthetics';

interface Props {
  checkGroup?: string;
  failedSteps?: FailedStepsApiResponse;
}

export const FailedStep = ({ checkGroup, failedSteps }: Props) => {
  const thisFailedStep = failedSteps?.steps?.find(
    (fs) => !!checkGroup && fs.monitor.check_group === checkGroup
  );

  if (!thisFailedStep) {
    return <>--</>;
  }
  return (
    <div>
      {thisFailedStep.synthetics?.step?.index}. {thisFailedStep.synthetics?.step?.name}
    </div>
  );
};
