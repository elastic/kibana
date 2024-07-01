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
import type { InputType } from '../../../../../../common';
import { useActions, type State } from '../../state';
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
  { value: 'cel', text: 'Common Expression Language (CEL)' },
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
  connector: State['connector'];
  isGenerating: State['isGenerating'];
}
export const DataStreamStep = React.memo<DataStreamStepProps>(
  ({ integrationSettings, connector, isGenerating }) => {
    const { setIntegrationSettings, setIsGenerating, setStep, setResult } = useActions();
    const { isLoading: isLoadingPackageNames, packageNames } = useLoadPackageNames(); // this is used to avoid duplicate names

    const [name, setName] = useState<string>(integrationSettings?.name ?? '');
    const [dataStreamName, setDataStreamName] = useState<string>(
      integrationSettings?.dataStreamName ?? ''
    );
    const [invalidFields, setInvalidFields] = useState({ name: false, dataStreamName: false });

    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        name: (e: React.ChangeEvent<HTMLInputElement>) => {
          const nextName = e.target.value;
          setName(nextName);
          if (!isValidName(nextName) || packageNames?.has(nextName)) {
            setInvalidFields((current) => ({ ...current, name: true }));
            setIntegrationValues({ name: undefined });
          } else {
            setInvalidFields((current) => ({ ...current, name: false }));
            setIntegrationValues({ name: nextName });
          }
        },
        dataStreamName: (e: React.ChangeEvent<HTMLInputElement>) => {
          const nextDataStreamName = e.target.value;
          setDataStreamName(nextDataStreamName);
          if (!isValidName(nextDataStreamName)) {
            setInvalidFields((current) => ({ ...current, dataStreamName: true }));
            setIntegrationValues({ dataStreamName: undefined });
          } else {
            setInvalidFields((current) => ({ ...current, dataStreamName: false }));
            setIntegrationValues({ dataStreamName: nextDataStreamName });
          }
        },
        // inputs without validation
        dataStreamTitle: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamTitle: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamDescription: e.target.value }),
        inputType: (e: React.ChangeEvent<HTMLSelectElement>) => {
          setIntegrationValues({ inputType: e.target.value as InputType });
        },
      };
    }, [setIntegrationValues, setInvalidFields, packageNames]);

    useEffect(() => {
      // Pre-populates the name from the title set in the previous step.
      // Only executed once when the packageNames are loaded
      if (packageNames != null && integrationSettings?.name == null && integrationSettings?.title) {
        const generatedName = getNameFromTitle(integrationSettings.title);
        if (!packageNames.has(generatedName)) {
          setName(generatedName);
          setIntegrationValues({ name: generatedName });
        }
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
      if (packageNames && name && packageNames.has(name)) {
        return i18n.NAME_ALREADY_EXISTS_ERROR;
      }
    }, [packageNames, name]);

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
                  helpText={
                    !nameInputError && !invalidFields.name ? i18n.NO_SPACES_HELP : undefined
                  }
                  isInvalid={!!nameInputError || invalidFields.name}
                  error={[nameInputError ?? i18n.NO_SPACES_HELP]}
                >
                  <EuiFieldText
                    name="name"
                    value={name}
                    onChange={onChange.name}
                    isInvalid={invalidFields.name}
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
                <EuiFormRow
                  label={i18n.DATA_STREAM_NAME_LABEL}
                  helpText={!invalidFields.dataStreamName ? i18n.NO_SPACES_HELP : undefined}
                  isInvalid={invalidFields.dataStreamName}
                  error={[i18n.NO_SPACES_HELP]}
                >
                  <EuiFieldText
                    name="dataStreamName"
                    value={dataStreamName}
                    onChange={onChange.dataStreamName}
                    isInvalid={invalidFields.dataStreamName}
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
              connector={connector}
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
