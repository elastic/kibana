/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isPlainObject } from 'lodash/fp';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';

const MaxLogsSampleRows = 10;

/**
 * Parse the logs sample file content (json or ndjson) and return the parsed logs sample
 */
const parseLogsContent = (
  fileContent: string | undefined,
  fileType: string
): { error?: string; isTruncated?: boolean; logsSampleParsed?: string[] } => {
  if (fileContent == null) {
    return { error: i18n.LOGS_SAMPLE_ERROR.CAN_NOT_READ };
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
    return { error: i18n.LOGS_SAMPLE_ERROR.FORMAT(fileType) };
  }

  if (!Array.isArray(parsedContent)) {
    return { error: i18n.LOGS_SAMPLE_ERROR.NOT_ARRAY };
  }
  if (parsedContent.length === 0) {
    return { error: i18n.LOGS_SAMPLE_ERROR.EMPTY };
  }

  let isTruncated = false;
  if (parsedContent.length > MaxLogsSampleRows) {
    parsedContent = parsedContent.slice(0, MaxLogsSampleRows);
    isTruncated = true;
  }

  if (parsedContent.some((log) => !isPlainObject(log))) {
    return { error: i18n.LOGS_SAMPLE_ERROR.NOT_OBJECT };
  }

  const logsSampleParsed = parsedContent.map((log) => JSON.stringify(log));
  return { isTruncated, logsSampleParsed };
};

interface SampleLogsInputProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
}
export const SampleLogsInput = React.memo<SampleLogsInputProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const { notifications } = useKibana().services;
    const [isParsing, setIsParsing] = useState(false);
    const [sampleFileError, setSampleFileError] = useState<string>();

    const onChangeLogsSample = useCallback(
      (files: FileList | null) => {
        const logsSampleFile = files?.[0];
        if (logsSampleFile == null) {
          setSampleFileError(undefined);
          setIntegrationSettings({ ...integrationSettings, logsSampleParsed: undefined });
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          const fileContent = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsText` to load the file.
          const { error, isTruncated, logsSampleParsed } = parseLogsContent(
            fileContent,
            logsSampleFile.type
          );
          setIsParsing(false);
          setSampleFileError(error);
          if (error) {
            setIntegrationSettings({ ...integrationSettings, logsSampleParsed: undefined });
            return;
          }

          if (isTruncated) {
            notifications?.toasts.addInfo(i18n.LOGS_SAMPLE_TRUNCATED(MaxLogsSampleRows));
          }

          setIntegrationSettings({
            ...integrationSettings,
            logsSampleParsed,
          });
        };
        setIsParsing(true);
        reader.readAsText(logsSampleFile);
      },
      [integrationSettings, setIntegrationSettings, notifications?.toasts, setIsParsing]
    );
    return (
      <EuiFormRow
        label={i18n.LOGS_SAMPLE_LABEL}
        helpText={
          <EuiText color="danger" size="xs">
            {sampleFileError}
          </EuiText>
        }
        isInvalid={sampleFileError != null}
      >
        <>
          <EuiCallOut iconType="iInCircle" color="warning">
            {i18n.LOGS_SAMPLE_WARNING}
          </EuiCallOut>
          <EuiSpacer size="s" />

          <EuiFilePicker
            id="logsSampleFilePicker"
            initialPromptText={
              <>
                <EuiText size="s" textAlign="center">
                  {i18n.LOGS_SAMPLE_DESCRIPTION}
                </EuiText>
                <EuiText size="xs" color="subdued" textAlign="center">
                  {i18n.LOGS_SAMPLE_DESCRIPTION_2}
                </EuiText>
              </>
            }
            onChange={onChangeLogsSample}
            display="large"
            aria-label="Upload logs sample file"
            accept="application/json,application/x-ndjson"
            isLoading={isParsing}
          />
        </>
      </EuiFormRow>
    );
  }
);
SampleLogsInput.displayName = 'SampleLogsInput';
