/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useParams } from 'react-router-dom';
import { fetchLastSuccessfulCheck } from '../../../state';
import { getShortTimeStamp } from '../../../utils/formatting';
import { ScreenshotLink } from './screenshot/screenshot_link';
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
      <ScreenshotLink lastSuccessfulCheck={lastSuccessfulCheck} />
      <StepScreenshotDisplay
        checkGroup={lastSuccessfulCheck.monitor.check_group}
        isScreenshotRef={Boolean(lastSuccessfulCheck.synthetics?.isScreenshotRef)}
        isFullScreenshot={Boolean(lastSuccessfulCheck.synthetics?.isFullScreenshot)}
        stepIndex={Number(stepIndex)}
        stepName={step.synthetics?.step?.name}
        lazyLoad={false}
      />
      <EuiSpacer size="xs" />
      <Label>{getShortTimeStamp(moment(lastSuccessfulCheck.timestamp))}</Label>
    </>
  );
};

const Label = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.euiSizeXS};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;
