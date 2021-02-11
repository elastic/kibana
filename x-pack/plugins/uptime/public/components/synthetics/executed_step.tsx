/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { CodeBlockAccordion } from './code_block_accordion';
import { Ping } from '../../../common/runtime_types/ping';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { StepScreenshots } from './check_steps/step_expanded_row/step_screenshots';

const CODE_BLOCK_OVERFLOW_HEIGHT = 360;

interface ExecutedStepProps {
  step: Ping;
  index: number;
  browserConsole?: string;
}

const Label = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

const Message = euiStyled.div`
  font-weight: bold;
  font-size:${({ theme }) => theme.eui.euiFontSizeM};
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.m};
`;

export const ExecutedStep: FC<ExecutedStepProps> = ({ step, index, browserConsole = '' }) => {
  const isSucceeded = step.synthetics?.payload?.status === 'succeeded';

  return (
    <>
      <div style={{ padding: '8px', maxWidth: 1000 }}>
        <EuiSpacer size="s" />
        {step.synthetics?.error?.message && (
          <EuiText>
            <Label>
              {i18n.translate('xpack.uptime.synthetics.executedStep.errorHeading', {
                defaultMessage: 'Error message',
              })}
            </Label>
            <Message>{step.synthetics?.error?.message}</Message>
          </EuiText>
        )}
        <EuiSpacer />
        <CodeBlockAccordion
          id={step.synthetics?.step?.name + String(index)}
          buttonContent={i18n.translate(
            'xpack.uptime.synthetics.executedStep.scriptHeading.label',
            {
              defaultMessage: 'Script executed at this step',
            }
          )}
          overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
          language="javascript"
          initialIsOpen={!isSucceeded}
        >
          {step.synthetics?.payload?.source}
        </CodeBlockAccordion>{' '}
        <EuiSpacer />
        <CodeBlockAccordion
          id={step.synthetics?.step?.name + String(index)}
          buttonContent={i18n.translate(
            'xpack.uptime.synthetics.executedStep.consoleOutput.label',
            {
              defaultMessage: 'Console output',
            }
          )}
          overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
          language="javascript"
          initialIsOpen={!isSucceeded}
        >
          {browserConsole}
        </CodeBlockAccordion>
        <EuiSpacer />
        <StepScreenshots step={step} />
        <EuiSpacer />
        <CodeBlockAccordion
          id={`${step.synthetics?.step?.name}_stack`}
          buttonContent={i18n.translate('xpack.uptime.synthetics.executedStep.stackTrace', {
            defaultMessage: 'Stack trace',
          })}
          language="html"
          overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
          initialIsOpen={!isSucceeded}
        >
          {step.synthetics?.error?.stack}
        </CodeBlockAccordion>
      </div>
    </>
  );
};
