/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
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
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ML_ERRORS } from '../../../../../common/anomaly_detection';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { createJobs } from './create_jobs';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { useAnomalyDetectionJobsContext } from '../../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';

interface Props {
  currentEnvironments: string[];
  onCreateJobSuccess: () => void;
  onCancel: () => void;
}

type ApiResponse =
  APIReturnType<'GET /internal/apm/settings/anomaly-detection/environments'>;
const INITIAL_DATA: ApiResponse = { environments: [] };

export function AddEnvironments({
  currentEnvironments,
  onCreateJobSuccess,
  onCancel,
}: Props) {
  const { notifications, application } = useApmPluginContext().core;
  const { anomalyDetectionJobsRefetch } = useAnomalyDetectionJobsContext();
  const canCreateJob = !!application.capabilities.ml.canCreateJob;
  const { toasts } = notifications;
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) =>
      callApmApi(`GET /internal/apm/settings/anomaly-detection/environments`),
    [],
    { preservePreviousData: false }
  );

  const environmentOptions = data.environments.map((env) => ({
    label: getEnvironmentLabel(env),
    value: env,
    disabled: currentEnvironments.includes(env),
  }));

  const [isSaving, setIsSaving] = useState(false);

  const [selectedOptions, setSelected] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  if (!canCreateJob) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        body={<>{ML_ERRORS.MISSING_WRITE_PRIVILEGES}</>}
      />
    );
  }

  const isLoading = status === FETCH_STATUS.LOADING;
  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'xpack.apm.settings.anomalyDetection.addEnvironments.titleText',
            { defaultMessage: 'Select environments' }
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
            isLoading={isSaving}
            isDisabled={isSaving || selectedOptions.length === 0}
            fill
            onClick={async () => {
              setIsSaving(true);

              const selectedEnvironments = selectedOptions.map(
                ({ value }) => value as string
              );
              const success = await createJobs({
                environments: selectedEnvironments,
                toasts,
              });
              if (success) {
                anomalyDetectionJobsRefetch();
                onCreateJobSuccess();
              }
              setIsSaving(false);
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
    </>
  );
}
