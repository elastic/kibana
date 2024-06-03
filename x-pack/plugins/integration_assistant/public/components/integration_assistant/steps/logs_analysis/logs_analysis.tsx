/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IntegrationSettings } from '../../types';
import * as i18n from './translations';
import { AssistantState } from '../../hooks/use_assistant_state';

const MAX_LOGS_SAMPLE_SIZE = 10;

interface LogsAnalysisProps {
  integrationSettings: AssistantState['integrationSettings'];
  setIntegrationSettings: (param: IntegrationSettings) => void;
}

// TODO: unit test this, add support for ndjson
const parseLogsContent = (
  fileContent: string | undefined
): { error?: string; isTruncated?: boolean; logsSampleParsed?: string[] } => {
  if (fileContent == null) {
    return { error: 'Failed to read the logs sample file' };
  }
  let parsedContent;
  try {
    parsedContent = JSON.parse(fileContent);
  } catch (_) {
    return { error: 'The logs sample file is not a valid JSON file' };
  }

  if (!Array.isArray(parsedContent)) {
    return { error: 'The logs sample file is not a JSON array' };
  }
  if (parsedContent.length === 0) {
    return { error: 'The logs sample file is empty' };
  }

  let isTruncated = false;
  if (parsedContent.length > MAX_LOGS_SAMPLE_SIZE) {
    parsedContent = parsedContent.slice(0, MAX_LOGS_SAMPLE_SIZE);
    isTruncated = true;
  }

  if (parsedContent.some((log) => typeof log !== 'object')) {
    return { error: 'The logs sample file contains non-object entries' };
  }

  const logsSampleParsed = parsedContent.map((log) => JSON.stringify(log));
  return { isTruncated, logsSampleParsed };
};

const isValidName = (name: string) => /^[a-z0-9_]+$/.test(name);
const getNameFromTitle = (title: string) => title.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');

export const LogsAnalysis = React.memo<LogsAnalysisProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const { notifications } = useKibana().services;
    const [isParsing, setIsParsing] = React.useState(false);
    const [invalidField, setInvalidField] = React.useState({ name: false, dataStreamName: false });

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
          const { error, isTruncated, logsSampleParsed } = parseLogsContent(fileContent);
          setIsParsing(false);

          if (error) {
            notifications?.toasts.addDanger(error);
            return;
          }

          if (isTruncated) {
            notifications?.toasts.addSuccess(
              `The logs sample has been parsed successfully and truncated to ${MAX_LOGS_SAMPLE_SIZE} rows.`
            );
          } else {
            notifications?.toasts.addSuccess('The logs sample has been parsed successfully.');
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
            {/* <EuiFormRow label={i18n.FORMAT_LABEL}>
              <EuiFieldText
                name="format"
                value="json/ndjson"
                // onChange={onChangeFormat}
                disabled
              />
            </EuiFormRow> */}
            <EuiFormRow label={i18n.LOGS_SAMPLE_LABEL}>
              <EuiFilePicker
                id="logsSampleFilePicker"
                initialPromptText="Select or drag and drop the logs sample file"
                onChange={onChangeLogsSample}
                display="large"
                aria-label="Use aria labels when no actual label is in use"
                accept="application/json"
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
