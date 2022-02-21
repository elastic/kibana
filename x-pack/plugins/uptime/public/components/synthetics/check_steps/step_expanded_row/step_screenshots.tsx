/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { StepScreenshotDisplay } from '../../step_screenshot_display';
import { JourneyStep } from '../../../../../common/runtime_types/ping/synthetics';
import { Ping } from '../../../../../common/runtime_types/ping/ping';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { useFetcher } from '../../../../../../observability/public';
import { fetchLastSuccessfulCheck } from '../../../../state/api/journey';
import { ScreenshotLink } from './screenshot_link';
import { getShortTimeStamp } from '../../../overview/monitor_list/columns/monitor_status_column';

const Label = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

interface Props {
  step: JourneyStep;
}

export const StepScreenshots = ({ step }: Props) => {
  const isSucceeded = step.synthetics?.payload?.status === 'succeeded';

  const { data } = useFetcher(() => {
    if (!isSucceeded) {
      return fetchLastSuccessfulCheck({
        timestamp: step['@timestamp'],
        monitorId: step.monitor.id,
        stepIndex: step.synthetics?.step?.index!,
        location: step.observer?.geo?.name,
      });
    }
  }, [step._id, step['@timestamp']]);

  const lastSuccessfulCheck: Ping | undefined = data;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <Label>
          {step.synthetics?.payload?.status !== 'succeeded' ? (
            <FormattedMessage
              id="xpack.uptime.synthetics.executedStep.screenshot.notSucceeded"
              defaultMessage="Screenshot for {status} check"
              values={{ status: step.synthetics?.payload?.status }}
            />
          ) : (
            <FormattedMessage
              id="xpack.uptime.synthetics.executedStep.screenshot.not"
              defaultMessage="Screenshot"
            />
          )}
        </Label>
        <StepScreenshotDisplay
          checkGroup={step.monitor.check_group}
          isScreenshotRef={Boolean(step.synthetics?.isScreenshotRef)}
          isFullScreenshot={Boolean(step.synthetics?.isFullScreenshot)}
          stepIndex={step.synthetics?.step?.index}
          stepName={step.synthetics?.step?.name}
          lazyLoad={false}
        />
        <EuiSpacer size="xs" />
        <Label>{getShortTimeStamp(moment(step['@timestamp']))}</Label>
      </EuiFlexItem>
      {!isSucceeded && lastSuccessfulCheck?.monitor && (
        <EuiFlexItem>
          <ScreenshotLink lastSuccessfulCheck={lastSuccessfulCheck} />
          <StepScreenshotDisplay
            checkGroup={lastSuccessfulCheck.monitor.check_group}
            isScreenshotRef={Boolean(lastSuccessfulCheck.synthetics?.isScreenshotRef)}
            isFullScreenshot={Boolean(lastSuccessfulCheck.synthetics?.isFullScreenshot)}
            stepIndex={step.synthetics?.step?.index}
            stepName={step.synthetics?.step?.name}
            lazyLoad={false}
          />
          <EuiSpacer size="xs" />
          <Label>{getShortTimeStamp(moment(lastSuccessfulCheck.timestamp))}</Label>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
