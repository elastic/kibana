/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';
import { useActions } from '../../state';

const MAX_IMPORT_PAYLOAD_BYTES = 9000000; // 9 MegaBytes

interface SampleLogsInputProps {
  integrationSettings: IntegrationSettings | undefined;
}
export const SampleLogsInput = React.memo<SampleLogsInputProps>(({ integrationSettings }) => {
  const { setIntegrationSettings } = useActions();
  const [isParsing, setIsParsing] = useState(false);
  const [sampleFileError, setSampleFileError] = useState<string>();

  const onChangeLogsSample = useCallback(
    (files: FileList | null) => {
      const logsSampleFile = files?.[0];
      if (logsSampleFile == null) {
        setSampleFileError(undefined);
        setIntegrationSettings({ ...integrationSettings, encodedLogSamples: undefined });
        return;
      }

      if (logsSampleFile.size > MAX_IMPORT_PAYLOAD_BYTES) {
        // File size limited to 9 MegaBytes
        setSampleFileError(i18n.LOGS_SAMPLE_ERROR.LOGS_SAMPLE_FILE_TOO_LARGE);
        setIntegrationSettings({ ...integrationSettings, encodedLogSamples: undefined });
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const encodedLogSamples = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsDataURL` to load the file.
        setIsParsing(false);
        if (encodedLogSamples === undefined) {
          setSampleFileError(i18n.LOGS_SAMPLE_ERROR.EMPTY);
          setIntegrationSettings({ ...integrationSettings, encodedLogSamples: undefined });
          return;
        }
        setIntegrationSettings({
          ...integrationSettings,
          encodedLogSamples,
        });
      };
      setIsParsing(true);
      reader.readAsDataURL(logsSampleFile);
    },
    [integrationSettings, setIntegrationSettings, setIsParsing]
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
            </>
          }
          onChange={onChangeLogsSample}
          display="large"
          aria-label="Upload logs sample file"
          isLoading={isParsing}
          data-test-subj="logsSampleFilePicker"
          data-loading={isParsing}
        />
      </>
    </EuiFormRow>
  );
});
SampleLogsInput.displayName = 'SampleLogsInput';
