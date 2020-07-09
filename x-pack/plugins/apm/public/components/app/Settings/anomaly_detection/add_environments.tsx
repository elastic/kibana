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
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { createJobs } from './create_jobs';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

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

  const environmentOptions = data.map((env) => ({
    label: env === ENVIRONMENT_NOT_DEFINED ? NOT_DEFINED_OPTION_LABEL : env,
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
            'xpack.apm.settings.anomalyDetection.addEnvironments.titleText',
            {
              defaultMessage: 'Select environments',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText>
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.addEnvironments.descriptionText',
          {
            defaultMessage:
              'Select the service environments that you want to enable anomaly detection in. Anomalies will surface for all services and transaction types within the selected environments.',
          }
        )}
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.anomalyDetection.addEnvironments.selectorLabel',
          {
            defaultMessage: 'Environments',
          }
        )}
        fullWidth
      >
        <EuiComboBox
          isLoading={isLoading}
          placeholder={i18n.translate(
            'xpack.apm.settings.anomalyDetection.addEnvironments.selectorPlaceholder',
            {
              defaultMessage: 'Select or add environments',
            }
          )}
          options={environmentOptions}
          selectedOptions={selectedOptions}
          onChange={(nextSelectedOptions) => {
            setSelected(nextSelectedOptions);
          }}
          onCreateOption={(searchValue) => {
            if (currentEnvironments.includes(searchValue)) {
              return;
            }
            const newOption = {
              label: searchValue,
              value: searchValue,
            };
            setSelected([...selectedOptions, newOption]);
          }}
          isClearable={true}
        />
      </EuiFormRow>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty aria-label="Cancel" onClick={onCancel}>
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.addEnvironments.cancelButtonText',
              {
                defaultMessage: 'Cancel',
              }
            )}
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
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.addEnvironments.createJobsButtonText',
              {
                defaultMessage: 'Create Jobs',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </EuiPanel>
  );
};

const NOT_DEFINED_OPTION_LABEL = i18n.translate(
  'xpack.apm.filter.environment.notDefinedLabel',
  {
    defaultMessage: 'Not defined',
  }
);
