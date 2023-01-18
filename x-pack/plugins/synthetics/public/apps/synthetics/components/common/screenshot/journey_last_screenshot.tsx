/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { parseBadgeStatus } from '../monitor_test_result/status_badge';
import { JourneyStepScreenshotContainer } from './journey_step_screenshot_container';
import { ScreenshotImageSize } from './screenshot_size';

export const JourneyLastScreenshot = ({
  checkGroupId,
  size,
}: {
  checkGroupId: string;
  size: ScreenshotImageSize;
}) => {
  const { loading: stepsLoading, stepEnds } = useJourneySteps(checkGroupId);

  const lastSignificantStep = useMemo(() => {
    const copy = [...stepEnds];
    // Sort desc by timestamp
    copy.sort(
      (stepA, stepB) =>
        Number(new Date(stepB['@timestamp'])) - Number(new Date(stepA['@timestamp']))
    );
    return copy.find(
      (stepEnd) => parseBadgeStatus(stepEnd?.synthetics?.step?.status ?? 'skipped') !== 'skipped'
    );
  }, [stepEnds]);

  return (
    <JourneyStepScreenshotContainer
      checkGroup={lastSignificantStep?.monitor.check_group}
      initialStepNumber={lastSignificantStep?.synthetics?.step?.index}
      stepStatus={lastSignificantStep?.synthetics.payload?.status}
      allStepsLoaded={!stepsLoading}
      retryFetchOnRevisit={false}
      size={size}
    />
  );
};
