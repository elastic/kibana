/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';
import { useActions } from '../../state';

interface ApiDefinitionInputProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const ApiDefinitionInput = React.memo<ApiDefinitionInputProps>(({ integrationSettings }) => {
  const { setIntegrationSettings } = useActions();
  const [isParsing, setIsParsing] = useState(false);
  const [apiFileError, setApiFileError] = useState<string>();

  const onChangeApiDefinition = useCallback(
    (files: FileList | null) => {
      if (!files) {
        return;
      }

      setApiFileError(undefined);
      setIntegrationSettings({
        ...integrationSettings,
        apiDefinition: undefined,
      });

      const apiDefinitionFile = files[0];
      const reader = new FileReader();

      reader.onloadstart = function () {
        setIsParsing(true);
      };

      reader.onloadend = function () {
        setIsParsing(false);
      };

      reader.onload = function (e) {
        const fileContent = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsText` to load the file.

        if (fileContent == null) {
          setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ);
          return;
        }

        if (fileContent === '' && e.loaded > 100000) {
          // V8-based browsers can't handle large files and return an empty string
          // instead of an error; see https://stackoverflow.com/a/61316641
          setApiFileError(i18n.API_DEFINITION_ERROR.TOO_LARGE_TO_PARSE);
          return;
        }

        setIntegrationSettings({
          ...integrationSettings,
          apiDefinition: fileContent,
        });
      };

      const handleReaderError = function () {
        const message = reader.error?.message;
        if (message) {
          setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ_WITH_REASON(message));
        } else {
          setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ);
        }
      };

      reader.onerror = handleReaderError;
      reader.onabort = handleReaderError;

      reader.readAsText(apiDefinitionFile);
    },
    [integrationSettings, setIntegrationSettings, setIsParsing]
  );

  return (
    <EuiFormRow
      label={i18n.API_DEFINITION_LABEL}
      helpText={
        <EuiText color="danger" size="xs">
          {apiFileError}
        </EuiText>
      }
      isInvalid={apiFileError != null}
    >
      <>
        <EuiFilePicker
          id="apiDefinitionFilePicker"
          initialPromptText={
            <>
              <EuiText size="s" textAlign="center">
                {i18n.API_DEFINITION_DESCRIPTION}
              </EuiText>
              <EuiText size="xs" color="subdued" textAlign="center">
                {i18n.API_DEFINITION_DESCRIPTION_2}
              </EuiText>
            </>
          }
          onChange={onChangeApiDefinition}
          display="large"
          aria-label="Upload API definition file"
          isLoading={isParsing}
          data-test-subj="apiDefinitionFilePicker"
          data-loading={isParsing}
        />
      </>
    </EuiFormRow>
  );
});
ApiDefinitionInput.displayName = 'ApiDefinitionInput';
