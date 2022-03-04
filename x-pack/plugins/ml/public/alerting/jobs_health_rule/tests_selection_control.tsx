/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobsHealthRuleTestsConfig, JobsHealthTests } from '../../../common/types/alerts';
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';
import { HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';
import { TimeIntervalControl } from '../time_interval_control';

interface TestsSelectionControlProps {
  config: JobsHealthRuleTestsConfig;
  onChange: (update: JobsHealthRuleTestsConfig) => void;
  errors?: string[];
}

export const TestsSelectionControl: FC<TestsSelectionControlProps> = React.memo(
  ({ config, onChange, errors }) => {
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
      <>
        <EuiForm component="div" isInvalid={!!errors?.length} error={errors}>
          {(
            Object.entries(uiConfig) as Array<[JobsHealthTests, typeof uiConfig[JobsHealthTests]]>
          ).map(([name, conf], i) => {
            return (
              <EuiDescribedFormGroup
                key={name}
                title={<h4>{HEALTH_CHECK_NAMES[name]?.name}</h4>}
                description={HEALTH_CHECK_NAMES[name]?.description}
                fullWidth
                gutterSize={'s'}
              >
                <EuiFormRow>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.enableTestLabel"
                        defaultMessage="Enable"
                      />
                    }
                    onChange={updateCallback.bind(null, {
                      [name]: {
                        ...uiConfig[name],
                        enabled: !uiConfig[name].enabled,
                      },
                    })}
                    checked={uiConfig[name].enabled}
                  />
                </EuiFormRow>

                {name === 'delayedData' ? (
                  <>
                    <EuiSpacer size="m" />

                    <EuiFormRow
                      label={
                        <>
                          <FormattedMessage
                            id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountLabel"
                            defaultMessage="Number of documents"
                          />
                          <EuiToolTip
                            position="bottom"
                            content={
                              <FormattedMessage
                                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountHint"
                                defaultMessage="The threshold for the amount of missing documents to alert upon."
                              />
                            }
                          >
                            <EuiIcon type="questionInCircle" />
                          </EuiToolTip>
                        </>
                      }
                    >
                      <EuiFieldNumber
                        value={uiConfig.delayedData.docsCount}
                        onChange={(e) => {
                          updateCallback({
                            [name]: {
                              ...uiConfig[name],
                              docsCount: Number(e.target.value),
                            },
                          });
                        }}
                        min={1}
                      />
                    </EuiFormRow>

                    <EuiSpacer size="m" />

                    <TimeIntervalControl
                      label={
                        <>
                          <FormattedMessage
                            id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.timeIntervalLabel"
                            defaultMessage="Time interval"
                          />
                          <EuiToolTip
                            position="bottom"
                            content={
                              <FormattedMessage
                                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.timeIntervalHint"
                                defaultMessage="The lookback interval to check during rule execution for delayed data. By default derived from the longest bucket span and query delay."
                              />
                            }
                          >
                            <EuiIcon type="questionInCircle" />
                          </EuiToolTip>
                        </>
                      }
                      value={uiConfig.delayedData.timeInterval}
                      onChange={(e) => {
                        updateCallback({
                          [name]: {
                            ...uiConfig[name],
                            timeInterval: e,
                          },
                        });
                      }}
                    />
                  </>
                ) : null}
              </EuiDescribedFormGroup>
            );
          })}
        </EuiForm>
        <EuiSpacer size="l" />
      </>
    );
  }
);
