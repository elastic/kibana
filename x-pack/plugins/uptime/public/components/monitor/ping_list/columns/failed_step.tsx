/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FailedStepsApiResponse } from '../../../../../common/runtime_types';

interface Props {
  ping: Ping;
  failedSteps?: FailedStepsApiResponse;
}

export const FailedStep = ({ ping, failedSteps }: Props) => {
  const thisFailedStep = failedSteps?.steps?.find(
    (fs) => fs.monitor.check_group === ping.monitor.check_group
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
