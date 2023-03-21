/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormMonitorType, Step, StepMap } from '../types';
import { StepFields } from './step_fields';

const MONITOR_TYPE_STEP: Step = {
  title: i18n.translate('xpack.synthetics.monitorConfig.monitorTypeStep.title', {
    defaultMessage: 'Select a monitor type',
  }),
  children: (
    <StepFields
      description={
        <p>
          {i18n.translate('xpack.synthetics.monitorConfig.monitorTypeStep.description', {
            defaultMessage: 'Choose a monitor that best fits your use case',
          })}
        </p>
      }
      stepKey="step1"
    />
  ),
};
const MONITOR_DETAILS_STEP = (readOnly: boolean = false): Step => ({
  title: i18n.translate('xpack.synthetics.monitorConfig.monitorDetailsStep.title', {
    defaultMessage: 'Monitor details',
  }),
  children: (
    <StepFields
      description={
        <p>
          {i18n.translate('xpack.synthetics.monitorConfig.monitorDetailsStep.description', {
            defaultMessage: 'Provide some details about how your monitor should run',
          })}
        </p>
      }
      stepKey="step2"
      readOnly={readOnly}
    />
  ),
});

const SCRIPT_RECORDER_BTNS = (
  <EuiFlexGroup justifyContent="flexStart">
    <EuiFlexItem grow={false}>
      <EuiButton href={`elastic-synthetics-recorder://`} iconType="popout" iconSide="right">
        {i18n.translate('xpack.synthetics.monitorConfig.monitorScriptStep.scriptRecorder.launch', {
          defaultMessage: 'Launch Synthetics Recorder',
        })}
      </EuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        href="https://github.com/elastic/synthetics-recorder/releases/"
        iconType="download"
      >
        {i18n.translate(
          'xpack.synthetics.monitorConfig.monitorScriptStep.scriptRecorder.download',
          {
            defaultMessage: 'Download Synthetics Recorder',
          }
        )}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const MONITOR_SCRIPT_STEP: Step = {
  title: i18n.translate('xpack.synthetics.monitorConfig.monitorScriptStep.title', {
    defaultMessage: 'Add a script',
  }),
  children: (
    <StepFields
      description={
        <>
          <p>
            <FormattedMessage
              id="xpack.synthetics.monitorConfig.monitorScriptStep.description"
              defaultMessage="Use Elastic Synthetics Recorder to generate a script and then upload it. Alternatively, you can write your own {playwright} script and paste it in the script editor."
              values={{
                playwright: (
                  <EuiLink href="https://playwright.dev/" target="_blank" external>
                    <FormattedMessage
                      id="xpack.synthetics.monitorConfig.monitorScriptStep.playwrightLink"
                      defaultMessage="Playwright"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
          {SCRIPT_RECORDER_BTNS}
        </>
      }
      stepKey="step3"
    />
  ),
};

const MONITOR_SCRIPT_STEP_EDIT = (readOnly: boolean = false): Step => ({
  title: i18n.translate('xpack.synthetics.monitorConfig.monitorScriptEditStep.title', {
    defaultMessage: 'Monitor script',
  }),
  children: (
    <StepFields
      description={
        <>
          <p>
            {readOnly ? (
              <FormattedMessage
                id="xpack.synthetics.monitorConfig.monitorScriptEditStepReadOnly.description"
                defaultMessage="You can only view and edit the script in the source file of the monitor."
              />
            ) : (
              <FormattedMessage
                id="xpack.synthetics.monitorConfig.monitorScriptEditStep.description"
                defaultMessage="Use Elastic Synthetics Recorder to generate and upload a script. Alternatively, you can edit the existing {playwright} script (or paste a new one) in the script editor."
                values={{
                  playwright: (
                    <EuiLink href="https://playwright.dev/" target="_blank" external>
                      <FormattedMessage
                        id="xpack.synthetics.monitorConfig.monitorScriptEditStep.playwrightLink"
                        defaultMessage="Playwright"
                      />
                    </EuiLink>
                  ),
                }}
              />
            )}
          </p>
          {readOnly ? null : SCRIPT_RECORDER_BTNS}
        </>
      }
      stepKey="scriptEdit"
      readOnly={readOnly}
      descriptionOnly={readOnly}
    />
  ),
});

export const ADD_MONITOR_STEPS: StepMap = {
  [FormMonitorType.MULTISTEP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP(), MONITOR_SCRIPT_STEP],
  [FormMonitorType.SINGLE]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP()],
  [FormMonitorType.HTTP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP()],
  [FormMonitorType.ICMP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP()],
  [FormMonitorType.TCP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP()],
};

export const EDIT_MONITOR_STEPS = (readOnly: boolean): StepMap => ({
  [FormMonitorType.MULTISTEP]: [MONITOR_SCRIPT_STEP_EDIT(readOnly), MONITOR_DETAILS_STEP(readOnly)],
  [FormMonitorType.SINGLE]: [MONITOR_DETAILS_STEP(readOnly)],
  [FormMonitorType.HTTP]: [MONITOR_DETAILS_STEP(readOnly)],
  [FormMonitorType.ICMP]: [MONITOR_DETAILS_STEP(readOnly)],
  [FormMonitorType.TCP]: [MONITOR_DETAILS_STEP(readOnly)],
});
