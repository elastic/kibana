/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { CodeBlockAccordion } from './code_block_accordion';
import { StepScreenshotDisplay } from './step_screenshot_display';
import { StatusBadge } from './status_badge';
import { Ping } from '../../../../common/runtime_types';
import { StepDetailLink } from '../../common/step_detail_link';
import { VIEW_PERFORMANCE } from './translations';

const CODE_BLOCK_OVERFLOW_HEIGHT = 360;

interface ExecutedStepProps {
  step: Ping;
  index: number;
  checkGroup: string;
}

export const ExecutedStep: FC<ExecutedStepProps> = ({ step, index, checkGroup }) => {
  return (
    <>
      <div style={{ padding: '8px' }}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText grow={false}>
              <strong>
                <FormattedMessage
                  id="xpack.uptime.synthetics.executedStep.stepName"
                  defaultMessage="{stepNumber}. {stepName}"
                  values={{
                    stepNumber: index + 1,
                    stepName: step.synthetics?.step?.name,
                  }}
                />
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <div>
              <StatusBadge status={step.synthetics?.payload?.status} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <StepScreenshotDisplay
                checkGroup={step.monitor.check_group}
                screenshotExists={step.synthetics?.screenshotExists}
                stepIndex={step.synthetics?.step?.index}
                stepName={step.synthetics?.step?.name}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {step.synthetics?.step?.index && (
                <span>
                  <StepDetailLink checkGroupId={checkGroup} stepIndex={step.synthetics.step.index}>
                    {VIEW_PERFORMANCE}
                  </StepDetailLink>
                  <EuiSpacer size="s" />
                </span>
              )}
              <CodeBlockAccordion
                id={step.synthetics?.step?.name + String(index)}
                buttonContent={i18n.translate(
                  'xpack.uptime.synthetics.executedStep.scriptHeading',
                  {
                    defaultMessage: 'Step script',
                  }
                )}
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
                language="javascript"
              >
                {step.synthetics?.payload?.source}
              </CodeBlockAccordion>
              <CodeBlockAccordion
                id={`${step.synthetics?.step?.name}_error`}
                buttonContent={i18n.translate('xpack.uptime.synthetics.executedStep.errorHeading', {
                  defaultMessage: 'Error',
                })}
                language="html"
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
              >
                {step.synthetics?.error?.message}
              </CodeBlockAccordion>
              <CodeBlockAccordion
                id={`${step.synthetics?.step?.name}_stack`}
                buttonContent={i18n.translate('xpack.uptime.synthetics.executedStep.stackTrace', {
                  defaultMessage: 'Stack trace',
                })}
                language="html"
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
              >
                {step.synthetics?.error?.stack}
              </CodeBlockAccordion>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </>
  );
};
