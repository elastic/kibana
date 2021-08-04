/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormFieldset, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { JobsHealthRuleTestsConfig, JobsHealthTests } from '../../../common/types/alerts';
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
      {Object.entries(uiConfig).map(([name, conf], i) => {
        return (
          <Fragment key={name}>
            <EuiFormRow
              isInvalid={Object.keys(uiConfig).length === i + 1 && !!errors?.length}
              error={errors}
            >
              <EuiSwitch
                label={HEALTH_CHECK_NAMES[name as JobsHealthTests]}
                onChange={updateCallback.bind(null, {
                  [name]: { enabled: !uiConfig[name as JobsHealthTests].enabled },
                })}
                checked={uiConfig[name as JobsHealthTests].enabled}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </EuiFormFieldset>
  );
};
