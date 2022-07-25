/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { EuiDescribedFormGroup, EuiForm, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  TransformHealthRuleTestsConfig,
  TransformHealthTests,
} from '../../../common/types/alerting';
import { getResultTestConfig } from '../../../common/utils/alerts';
import { TRANSFORM_HEALTH_CHECK_NAMES } from '../../../common/constants';

interface TestsSelectionControlProps {
  config: TransformHealthRuleTestsConfig;
  onChange: (update: TransformHealthRuleTestsConfig) => void;
  errors?: string[];
}

export const TestsSelectionControl: FC<TestsSelectionControlProps> = React.memo(
  ({ config, onChange, errors }) => {
    const uiConfig = getResultTestConfig(config);

    const updateCallback = useCallback(
      (update: Partial<Exclude<TransformHealthRuleTestsConfig, undefined>>) => {
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
            Object.entries(uiConfig) as Array<
              [TransformHealthTests, typeof uiConfig[TransformHealthTests]]
            >
          ).map(([name, conf], i) => {
            return (
              <EuiDescribedFormGroup
                key={name}
                title={<h4>{TRANSFORM_HEALTH_CHECK_NAMES[name]?.name}</h4>}
                description={TRANSFORM_HEALTH_CHECK_NAMES[name]?.description}
                fullWidth
                gutterSize={'s'}
              >
                <EuiFormRow>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.transform.alertTypes.transformHealth.testsSelection.enableTestLabel"
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
              </EuiDescribedFormGroup>
            );
          })}
        </EuiForm>
        <EuiSpacer size="l" />
      </>
    );
  }
);
