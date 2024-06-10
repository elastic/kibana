/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  connectorId: State['connectorId'];
  isGenerating: State['isGenerating'];
  setIntegrationSettings: Actions['setIntegrationSettings'];
  setIsGenerating: Actions['setIsGenerating'];
  setStep: Actions['setStep'];
  setResult: Actions['setResult'];
}
export const DataStreamStep = React.memo<DataStreamStepProps>(
  ({
    integrationSettings,
    connectorId,
    isGenerating,
    setIntegrationSettings,
    setIsGenerating,
    setStep,
    setResult,
  }) => {
    const [invalidField, setInvalidField] = useState({ name: false, dataStreamName: false });

    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        name: (e: React.ChangeEvent<HTMLInputElement>) => {
          const name = e.target.value;
          if (!isValidName(name)) {
            setInvalidField((current) => ({ ...current, name: true }));
          } else {
            setInvalidField((current) => ({ ...current, name: false }));
          }
          setIntegrationValues({ name });
        },
        dataStreamTitle: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamTitle: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamDescription: e.target.value }),
        dataStreamName: (e: React.ChangeEvent<HTMLInputElement>) => {
          const dataStreamName = e.target.value;
          if (!isValidName(dataStreamName)) {
            setInvalidField((current) => ({ ...current, dataStreamName: true }));
          } else {
            setInvalidField((current) => ({ ...current, dataStreamName: false }));
          }
          setIntegrationValues({ dataStreamName: e.target.value });
        },
        inputType: (e: React.ChangeEvent<HTMLSelectElement>) => {
          setIntegrationValues({ inputType: e.target.value as InputType });
        },
      };
    }, [setIntegrationValues, setInvalidField]);

    useEffect(() => {
      const defaultNames: Partial<IntegrationSettings> = {};
      if (integrationSettings?.title && integrationSettings.name == null) {
        defaultNames.name = getNameFromTitle(integrationSettings.title);
      }
      if (integrationSettings?.dataStreamTitle && integrationSettings.dataStreamName == null) {
        defaultNames.dataStreamName = getNameFromTitle(integrationSettings.dataStreamTitle);
      }
      setIntegrationValues(defaultNames);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <StepContentWrapper
            title={i18n.INTEGRATION_NAME_TITLE}
            subtitle={i18n.INTEGRATION_NAME_DESCRIPTION}
          >
            <EuiPanel hasShadow={false} hasBorder>
              <EuiForm component="form" fullWidth>
                <EuiFormRow label={i18n.INTEGRATION_NAME_LABEL} helpText={i18n.NO_SPACES_HELP}>
                  <EuiFieldText
                    name="name"
                    value={integrationSettings?.name ?? ''}
                    onChange={onChange.name}
                    isInvalid={invalidField.name}
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
                    isInvalid={invalidField.dataStreamName}
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
