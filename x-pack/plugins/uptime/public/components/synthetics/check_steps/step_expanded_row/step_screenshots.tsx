/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { StepScreenshotDisplay } from '../../step_screenshot_display';
import { Ping } from '../../../../../common/runtime_types/ping';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { UptimeSettingsContext } from '../../../../contexts';

const Label = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

interface Props {
  step: Ping;
}

export const StepScreenshots = ({ step }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

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
      </EuiFlexItem>
      {step.synthetics?.payload?.status !== 'succeeded' && (
        <EuiFlexItem>
          <Label>
            <FormattedMessage
              id="xpack.uptime.synthetics.executedStep.screenshot.success"
              defaultMessage="Screenshot from last successful check"
            />
          </Label>
          <StepScreenshotDisplay
            srcPath={
              basePath +
              `/api/uptime/step/screenshot/${step.monitor.id}/${step.synthetics?.step?.index}?timestamp=${step.timestamp}&_debug=true`
            }
            allowPopover={false}
            checkGroup={step.monitor.check_group}
            screenshotExists={step.synthetics?.screenshotExists}
            stepIndex={step.synthetics?.step?.index}
            stepName={step.synthetics?.step?.name}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
