/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { createJobs } from './create_jobs';

interface Props {
  currentEnvironments: string[];
  onCreateJobSuccess: () => void;
  onCancel: () => void;
}
export const AddEnvironments = ({
  currentEnvironments,
  onCreateJobSuccess,
  onCancel,
}: Props) => {
  const { toasts } = useApmPluginContext().core.notifications;
  const { data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({
        pathname: `/api/apm/settings/anomaly-detection/environments`,
      }),
    [],
    { preservePreviousData: false }
  );

  const availableEnvironmentOptions = data
    .filter((env) => env !== ALL_OPTION_VALUE)
    .map((env) => ({
      label: env,
      value: env,
      disabled: currentEnvironments.includes(env),
    }));

  const [selectedOptions, setSelected] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const isLoading =
    status === FETCH_STATUS.PENDING || status === FETCH_STATUS.LOADING;
  return (
    <EuiPanel>
      <EuiTitle>
        <h2>
          {i18n.translate(
            'xpack.apm.settings.anomalyDetection.selectEnvironments',
            {
              defaultMessage: 'Select environments',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText>
        Choose the service environments that you want to enable anomaly
        detection for. Anomalies will surface for all the services and their
        transaction types. You can also enter the environment name which has yet
        to appear to analyze as soon as it is received.
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTitle>
        <h3>Environments</h3>
      </EuiTitle>
      <EuiComboBox
        isLoading={isLoading}
        placeholder="Select or add environments"
        options={availableEnvironmentOptions}
        selectedOptions={selectedOptions}
        onChange={(nextSelectedOptions) => {
          setSelected(nextSelectedOptions);
        }}
        onCreateOption={(searchValue) => {
          const newOption = {
            label: searchValue,
            value: searchValue,
          };
          setSelected([...selectedOptions, newOption]);
        }}
        isClearable={true}
      />
      <EuiText>
        You can also specify an environment variable yet to be sent.
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty aria-label="Cancel" onClick={onCancel}>
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            disabled={selectedOptions.length === 0}
            onClick={async () => {
              const selectedEnvironments = selectedOptions.map(
                ({ value }) => value as string
              );
              const success = await createJobs({
                environments: selectedEnvironments,
                toasts,
              });
              if (success) {
                onCreateJobSuccess();
              }
            }}
          >
            Create Jobs
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </EuiPanel>
  );
};
