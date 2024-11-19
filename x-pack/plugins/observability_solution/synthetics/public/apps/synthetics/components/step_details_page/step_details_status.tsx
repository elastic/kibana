/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiDescriptionList, EuiSkeletonText } from '@elastic/eui';
import { parseBadgeStatus, StatusBadge } from '../common/monitor_test_result/status_badge';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { STATUS_LABEL } from '../common/components/monitor_status';

export const StepDetailsStatus = () => {
  const { currentStep } = useJourneySteps();

  let content = <EuiSkeletonText lines={1} />;

  if (currentStep?.synthetics.step?.status) {
    content = <StatusBadge status={parseBadgeStatus(currentStep.synthetics.step?.status)} />;
  }

  return (
    <EuiDescriptionList
      align="left"
      compressed={false}
      listItems={[{ title: STATUS_LABEL, description: content }]}
    />
  );
};
