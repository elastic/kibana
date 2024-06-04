/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isPlainObject } from 'lodash/fp';
import type { InputType } from '../../../../../common/types';
import type { IntegrationSettings, State } from '../../state';
import * as i18n from './translations';

const MAX_LOGS_SAMPLE_SIZE = 10;

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

/**
 * Parse the logs sample file content (json or ndjson) and return the parsed logs sample
 */
const parseLogsContent = (
  fileContent: string | undefined,
  fileType: string
): { error?: string; isTruncated?: boolean; logsSampleParsed?: string[] } => {
  if (fileContent == null) {
    return { error: 'Failed to read the logs sample file' };
  }
  let parsedContent;
  try {
    if (fileType === 'application/json') {
      parsedContent = JSON.parse(fileContent);
    } else if (fileType === 'application/x-ndjson') {
      parsedContent = fileContent
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line));
    }
  } catch (_) {
    return { error: `The logs sample file has not a valid ${fileType} format` };
  }

  if (!Array.isArray(parsedContent)) {
    return { error: 'The logs sample file is not an array' };
  }
  if (parsedContent.length === 0) {
    return { error: 'The logs sample file is empty' };
  }

  let isTruncated = false;
  if (parsedContent.length > MAX_LOGS_SAMPLE_SIZE) {
    parsedContent = parsedContent.slice(0, MAX_LOGS_SAMPLE_SIZE);
    isTruncated = true;
  }

  if (parsedContent.some((log) => !isPlainObject(log))) {
    return { error: 'The logs sample file contains non-object entries' };
  }

  const logsSampleParsed = parsedContent.map((log) => JSON.stringify(log));
  return { isTruncated, logsSampleParsed };
};

interface LogsAnalysisProps {
  integrationSettings: State['integrationSettings'];
  setIntegrationSettings: (param: IntegrationSettings) => void;
}
export const LogsAnalysis = React.memo<LogsAnalysisProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const { notifications } = useKibana().services;
    const [isParsing, setIsParsing] = useState(false);
    const [sampleFileError, setSampleFileError] = useState<string>();
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

    const onChangeLogsSample = useCallback(
      (files: FileList | null) => {
        const logsSampleFile = files?.[0];
        if (logsSampleFile == null) {
          setSampleFileError(undefined);
          setIntegrationSettings({
            ...integrationSettings,
            logsSampleFileName: undefined,
            logsSampleParsed: undefined,
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          const fileContent = e.target?.result as string | undefined; // we use readAsText so this should be a string
          const { error, isTruncated, logsSampleParsed } = parseLogsContent(
            fileContent,
            logsSampleFile.type
          );
          setIsParsing(false);
          setSampleFileError(error);
          if (error) {
            return;
          }

          if (isTruncated) {
            notifications?.toasts.addInfo(
              `The logs sample has been truncated to ${MAX_LOGS_SAMPLE_SIZE} rows.`
            );
          }

          setIntegrationSettings({
            ...integrationSettings,
            logsSampleFileName: logsSampleFile.name,
            logsSampleParsed,
          });
        };
        setIsParsing(true);
        reader.readAsText(logsSampleFile);
      },
      [integrationSettings, setIntegrationSettings, notifications?.toasts, setIsParsing]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h6>{i18n.LOGS_ANALYSIS_TITLE}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <p>{i18n.LOGS_ANALYSIS_DESCRIPTION}</p>
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiForm component="form" fullWidth>
            <EuiFormRow
              label={i18n.NAME_LABEL}
              helpText="It can only contain lowercase letters, numbers and _"
            >
              <EuiFieldText
                name="name"
                value={integrationSettings?.name ?? ''}
                onChange={onChange.name}
                isInvalid={invalidField.name}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.DATA_STREAM_NAME_LABEL}
              helpText="It can only contain lowercase letters, numbers and _"
            >
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
            <EuiFormRow
              label={i18n.LOGS_SAMPLE_LABEL}
              helpText={
                <EuiText color="danger" size="s">
                  {sampleFileError}
                </EuiText>
              }
              isInvalid={sampleFileError != null}
            >
              <EuiFilePicker
                id="logsSampleFilePicker"
                initialPromptText="json/ndjson format"
                onChange={onChangeLogsSample}
                display="large"
                aria-label="Upload logs sample file"
                accept="application/json,application/x-ndjson"
                isLoading={isParsing}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
LogsAnalysis.displayName = 'LogsAnalysis';
