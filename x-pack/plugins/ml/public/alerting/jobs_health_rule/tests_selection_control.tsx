/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormFieldset, EuiSwitch, EuiSpacer } from '@elastic/eui';
import { MlAnomalyDetectionJobsHealthRuleParams } from '../../../common/types/alerts';

type TestsConfig = MlAnomalyDetectionJobsHealthRuleParams['testsConfig'];

interface TestsSelectionControlProps {
  config: TestsConfig;
  onChange: (update: TestsConfig) => void;
}

export const TestsSelectionControl: FC<TestsSelectionControlProps> = ({ config, onChange }) => {
  const uiConfig: Required<Exclude<TestsConfig, undefined>> = {
    dataFeed: {
      enabled: config?.dataFeed?.enabled ?? true,
    },
    mml: {
      enabled: config?.mml?.enabled ?? true,
    },
    delayedData: {
      enabled: config?.delayedData?.enabled ?? true,
    },
    behindRealtime: {
      enabled: config?.behindRealtime?.enabled ?? true,
    },
    errorMessages: {
      enabled: config?.errorMessages?.enabled ?? true,
    },
  };

  const updateCallback = useCallback(
    (update: Partial<Exclude<TestsConfig, undefined>>) => {
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
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.datafeedCheck.label"
            defaultMessage="Datefeed is not started"
          />
        }
        onChange={updateCallback.bind(null, { dataFeed: { enabled: !uiConfig.dataFeed.enabled } })}
        checked={uiConfig.dataFeed.enabled}
      />

      <EuiSpacer size="s" />

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
            defaultMessage="Delayed data has occurred"
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
            defaultMessage="There are errors in job messages"
          />
        }
        onChange={updateCallback.bind(null, {
          errorMessages: { enabled: !uiConfig.errorMessages.enabled },
        })}
        checked={uiConfig.errorMessages.enabled}
      />

      <EuiSpacer size="s" />
    </EuiFormFieldset>
  );
};
