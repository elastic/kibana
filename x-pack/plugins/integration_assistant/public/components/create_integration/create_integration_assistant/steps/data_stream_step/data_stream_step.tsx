/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';
import type { InputType } from '../../../../../../common/types';
import type { Actions, State } from '../../state';
import type { IntegrationSettings } from '../../types';
import { StepContentWrapper } from '../step_content_wrapper';
import { SampleLogsInput } from './sample_logs_input';
import type { OnComplete } from './generation_modal';
import { GenerationModal } from './generation_modal';
import { useLoadPackageNames } from './use_load_package_names';
import * as i18n from './translations';

export const InputTypeOptions: Array<{ value: InputType; text: string }> = [
  { value: 'aws_cloudwatch', text: 'AWS Cloudwatch' },
  { value: 'aws_s3', text: 'AWS S3' },
  { value: 'azure_blob_storage', text: 'Azure Blob Storage' },
  { value: 'azure_eventhub', text: 'Azure Event Hub' },
  { value: 'cloudfoundry', text: 'Cloud Foundry' },
  { value: 'filestream', text: 'File Stream' },
  { value: 'gcp_pubsub', text: 'GCP Pub/Sub' },
  { value: 'gcs', text: 'Google Cloud Storage' },
  { value: 'http_endpoint', text: 'HTTP Endpoint' },
  { value: 'journald', text: 'Journald' },
  { value: 'kafka', text: 'Kafka' },
  { value: 'tcp', text: 'TCP' },
  { value: 'udp', text: 'UDP' },
];

const isValidName = (name: string) => /^[a-z0-9_]+$/.test(name);
const getNameFromTitle = (title: string) => title.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');

interface DataStreamStepProps {
  integrationSettings: State['integrationSettings'];
  invalidSettings: State['invalidSettings'];
  connectorId: State['connectorId'];
  isGenerating: State['isGenerating'];
  setIntegrationSettings: Actions['setIntegrationSettings'];
  setIsGenerating: Actions['setIsGenerating'];
  setStep: Actions['setStep'];
  setResult: Actions['setResult'];
  setInvalidSettings: Actions['setInvalidSettings'];
}
export const DataStreamStep = React.memo<DataStreamStepProps>(
  ({
    integrationSettings,
    invalidSettings,
    connectorId,
    isGenerating,
    setIntegrationSettings,
    setInvalidSettings,
    setIsGenerating,
    setStep,
    setResult,
  }) => {
    const { isLoading: isLoadingPackageNames, packageNames } = useLoadPackageNames();

    const addInvalidSetting = useCallback(
      (fieldName: keyof IntegrationSettings) => {
        setInvalidSettings([...(invalidSettings ?? []), fieldName]);
      },
      [invalidSettings, setInvalidSettings]
    );
    const removeInvalidSetting = useCallback(
      (fieldName: keyof IntegrationSettings) => {
        setInvalidSettings(invalidSettings?.filter((key) => key !== fieldName) ?? []);
      },
      [invalidSettings, setInvalidSettings]
    );
    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        name: (e: React.ChangeEvent<HTMLInputElement>) => {
          const name = e.target.value;
          if (!isValidName(name) || packageNames?.has(name)) {
            addInvalidSetting('name');
          } else {
            removeInvalidSetting('name');
          }
          setIntegrationValues({ name });
        },
        dataStreamTitle: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamTitle: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamDescription: e.target.value }),
        dataStreamName: (e: React.ChangeEvent<HTMLInputElement>) => {
          if (!isValidName(e.target.value)) {
            addInvalidSetting('dataStreamName');
          } else {
            removeInvalidSetting('dataStreamName');
          }
          setIntegrationValues({ dataStreamName: e.target.value });
        },
        inputType: (e: React.ChangeEvent<HTMLSelectElement>) => {
          setIntegrationValues({ inputType: e.target.value as InputType });
        },
      };
    }, [setIntegrationValues, addInvalidSetting, removeInvalidSetting, packageNames]);

    useEffect(() => {
      if (packageNames != null) {
        const defaultNames: Partial<IntegrationSettings> = {};
        if (integrationSettings?.title && integrationSettings.name == null) {
          const generatedName = getNameFromTitle(integrationSettings.title);
          if (!packageNames.has(generatedName)) {
            defaultNames.name = generatedName;
          }
        }
        if (integrationSettings?.dataStreamTitle && integrationSettings.dataStreamName == null) {
          const generatedDataStreamName = getNameFromTitle(integrationSettings.dataStreamTitle);
          if (!packageNames.has(generatedDataStreamName)) {
            defaultNames.dataStreamName = generatedDataStreamName;
          }
        }
        setIntegrationValues(defaultNames);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packageNames]);

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: State['result']) => {
        if (result) {
          setResult(result);
          setIsGenerating(false);
          setStep(4);
        }
      },
      [setResult, setIsGenerating, setStep]
    );
    const onGenerationClosed = useCallback(() => {
      setIsGenerating(false); // aborts generation
    }, [setIsGenerating]);

    const nameInputError = useMemo(() => {
      if (packageNames && integrationSettings?.name && packageNames.has(integrationSettings.name)) {
        return [i18n.NAME_ALREADY_EXISTS_ERROR];
      }
    }, [packageNames, integrationSettings?.name]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <StepContentWrapper
            title={i18n.INTEGRATION_NAME_TITLE}
            subtitle={i18n.INTEGRATION_NAME_DESCRIPTION}
          >
            <EuiPanel hasShadow={false} hasBorder>
              <EuiForm component="form" fullWidth>
                <EuiFormRow
                  label={i18n.INTEGRATION_NAME_LABEL}
                  helpText={i18n.NO_SPACES_HELP}
                  isInvalid={!!nameInputError}
                  error={nameInputError}
                >
                  <EuiFieldText
                    name="name"
                    value={integrationSettings?.name ?? ''}
                    onChange={onChange.name}
                    isInvalid={invalidSettings?.includes('name')}
                    isLoading={isLoadingPackageNames}
                    disabled={isLoadingPackageNames}
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiPanel>
          </StepContentWrapper>
        </EuiFlexItem>

        <EuiFlexItem>
          <StepContentWrapper
            title={i18n.DATA_STREAM_TITLE}
            subtitle={i18n.DATA_STREAM_DESCRIPTION}
          >
            <EuiPanel hasShadow={false} hasBorder>
              <EuiForm component="form" fullWidth>
                <EuiFormRow label={i18n.DATA_STREAM_TITLE_LABEL}>
                  <EuiFieldText
                    name="dataStreamTitle"
                    value={integrationSettings?.dataStreamTitle ?? ''}
                    onChange={onChange.dataStreamTitle}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DATA_STREAM_DESCRIPTION_LABEL}>
                  <EuiFieldText
                    name="dataStreamDescription"
                    value={integrationSettings?.dataStreamDescription ?? ''}
                    onChange={onChange.dataStreamDescription}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DATA_STREAM_NAME_LABEL} helpText={i18n.NO_SPACES_HELP}>
                  <EuiFieldText
                    name="dataStreamName"
                    value={integrationSettings?.dataStreamName ?? ''}
                    onChange={onChange.dataStreamName}
                    isInvalid={invalidSettings?.includes('dataStreamName')}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DATA_COLLECTION_METHOD_LABEL}>
                  <EuiSelect
                    name="dataCollectionMethod"
                    options={InputTypeOptions}
                    value={integrationSettings?.inputType ?? ''}
                    onChange={onChange.inputType}
                  />
                </EuiFormRow>
                <SampleLogsInput
                  integrationSettings={integrationSettings}
                  setIntegrationSettings={setIntegrationSettings}
                />
              </EuiForm>
            </EuiPanel>
          </StepContentWrapper>
          {isGenerating && (
            <GenerationModal
              integrationSettings={integrationSettings}
              connectorId={connectorId}
              onComplete={onGenerationCompleted}
              onClose={onGenerationClosed}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
DataStreamStep.displayName = 'DataStreamStep';
