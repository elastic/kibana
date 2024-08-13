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
        setIntegrationSettings({ ...integrationSettings, logsSampleParsed: undefined });
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const logsSampleParsed = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsDataURL` to load the file.
        setIsParsing(false);

        if (logsSampleParsed === undefined) {
          setSampleFileError('Empty Logs Sample file.');
          setIntegrationSettings({ ...integrationSettings, logsSampleParsed: undefined });
          return;
        }
        const base64encodedContent = logsSampleParsed.split('base64,')[1];
        const logsSampleOriginal = Buffer.from(base64encodedContent, 'base64').toString();

        setIntegrationSettings({
          ...integrationSettings,
          logsSampleParsed,
          logsSampleOriginal: logsSampleOriginal.split('\n'),
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
              <EuiText size="xs" color="subdued" textAlign="center">
                {i18n.LOGS_SAMPLE_DESCRIPTION_2}
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
