/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormFieldset, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { JobsHealthRuleTestsConfig } from '../../../common/types/alerts';
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';
import { HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';

interface TestsSelectionControlProps {
  config: JobsHealthRuleTestsConfig;
  onChange: (update: JobsHealthRuleTestsConfig) => void;
  errors?: string[];
}

export const TestsSelectionControl: FC<TestsSelectionControlProps> = ({
  config,
  onChange,
  errors,
}) => {
  const uiConfig = getResultJobsHealthRuleConfig(config);

  const updateCallback = useCallback(
    (update: Partial<Exclude<JobsHealthRuleTestsConfig, undefined>>) => {
      onChange({
        ...(config ?? {}),
        ...update,
      });
    },
    [onChange, config]
  );

  return (
    <EuiFormFieldset
      legend={{
        children: i18n.translate(
          'xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.legend',
          {
            defaultMessage: 'Select health checks to perform',
          }
        ),
      }}
    >
      <EuiFormRow isInvalid={!!errors?.length} error={errors}>
        <EuiSwitch
          label={HEALTH_CHECK_NAMES.datafeed}
          onChange={updateCallback.bind(null, {
            datafeed: { enabled: !uiConfig.datafeed.enabled },
          })}
          checked={uiConfig.datafeed.enabled}
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      {false && (
        <>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.mmlCheck.label"
                defaultMessage="Model memory limit monitoring"
              />
            }
            onChange={updateCallback.bind(null, { mml: { enabled: !uiConfig.mml.enabled } })}
            checked={uiConfig.mml.enabled}
          />

          <EuiSpacer size="s" />

          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedDataCheck.label"
                defaultMessage="Delayed data"
              />
            }
            onChange={updateCallback.bind(null, {
              delayedData: { enabled: !uiConfig.delayedData.enabled },
            })}
            checked={uiConfig.delayedData.enabled}
          />

          <EuiSpacer size="s" />

          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.jobBehindRealtimeCheck.label"
                defaultMessage="Job is running behind real-time"
              />
            }
            onChange={updateCallback.bind(null, {
              behindRealtime: { enabled: !uiConfig.behindRealtime.enabled },
            })}
            checked={uiConfig.behindRealtime.enabled}
          />

          <EuiSpacer size="s" />

          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.errorMessagesCheck.label"
                defaultMessage="There are errors in the job messages."
              />
            }
            onChange={updateCallback.bind(null, {
              errorMessages: { enabled: !uiConfig.errorMessages.enabled },
            })}
            checked={uiConfig.errorMessages.enabled}
          />

          <EuiSpacer size="s" />
        </>
      )}
    </EuiFormFieldset>
  );
};
