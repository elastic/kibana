/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { StepScreenshotDisplay } from '../../step_screenshot_display';
import { Ping } from '../../../../../common/runtime_types/ping';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../../../observability/public';
import { fetchLastSuccessfulStep } from '../../../../state/api/journey';

const Label = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

interface Props {
  step: Ping;
}

export const StepScreenshots = ({ step }: Props) => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  const isSucceeded = step.synthetics?.payload?.status === 'succeeded';

  const { data: lastSuccessfulStep } = useFetcher(() => {
    if (!isSucceeded) {
      return fetchLastSuccessfulStep({
        timestamp: step.timestamp,
        monitorId: step.monitor.id,
        stepIndex: step.synthetics?.step?.index!,
      });
    }
  }, [step.docId]);

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
          allowPopover={false}
          checkGroup={step.monitor.check_group}
          screenshotExists={step.synthetics?.screenshotExists}
          stepIndex={step.synthetics?.step?.index}
          stepName={step.synthetics?.step?.name}
        />
        <EuiSpacer size="xs" />
        <Label>{moment(step.timestamp).format(dateFormat)}</Label>
      </EuiFlexItem>
      {!isSucceeded && lastSuccessfulStep && (
        <EuiFlexItem>
          <Label>
            <FormattedMessage
              id="xpack.uptime.synthetics.executedStep.screenshot.success"
              defaultMessage="Screenshot from last successful check"
            />
          </Label>
          <StepScreenshotDisplay
            allowPopover={false}
            checkGroup={lastSuccessfulStep.monitor.check_group}
            screenshotExists={true}
            stepIndex={lastSuccessfulStep.synthetics?.step?.index}
            stepName={lastSuccessfulStep.synthetics?.step?.name}
          />
          <EuiSpacer size="xs" />
          <Label>{moment(lastSuccessfulStep.timestamp).format(dateFormat)}</Label>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
