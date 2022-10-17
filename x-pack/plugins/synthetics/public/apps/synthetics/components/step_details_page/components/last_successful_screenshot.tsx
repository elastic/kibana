/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { fetchLastSuccessfulCheck } from '../../../state';
import { StepScreenshotDisplay } from './screenshot/step_screenshot_display';
import { JourneyStep, Ping } from '../../../../../../common/runtime_types';

export const LastSuccessfulScreenshot = ({ step }: { step: JourneyStep }) => {
  const { stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { data } = useFetcher(() => {
    return fetchLastSuccessfulCheck({
      timestamp: step['@timestamp'],
      monitorId: step.monitor.id,
      stepIndex: Number(stepIndex),
      location: step.observer?.geo?.name,
    });
  }, [step._id, step['@timestamp']]);

  const lastSuccessfulCheck: Ping | undefined = data;

  if (!lastSuccessfulCheck) {
    return null;
  }

  return (
    <>
      <StepScreenshotDisplay
        checkGroup={lastSuccessfulCheck.monitor.check_group}
        isScreenshotRef={Boolean(lastSuccessfulCheck.synthetics?.isScreenshotRef)}
        isFullScreenshot={Boolean(lastSuccessfulCheck.synthetics?.isFullScreenshot)}
        stepIndex={Number(stepIndex)}
        stepName={step.synthetics?.step?.name}
        lazyLoad={false}
      />
      <EuiSpacer size="xs" />
    </>
  );
};
