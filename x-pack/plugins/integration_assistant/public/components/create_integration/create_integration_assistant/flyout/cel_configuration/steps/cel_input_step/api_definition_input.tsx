/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFilePicker, EuiFlexItem, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import Oas from 'oas';
import yaml from 'js-yaml';
import type { IntegrationSettings } from '../../../../types';
import * as i18n from './translations';
import { useActions } from '../../../../state';

interface PrepareOasErrorResult {
  error: string;
}
interface PrepareOasSuccessResult {
  oas: Oas | undefined;
}
type PrepareOasResult = PrepareOasSuccessResult | PrepareOasErrorResult;

/**
 * Prepares the OpenAPI specification file to send to the backend from the user-uploaded file.
 *
 * This function will return an error message if the uploaded API definition cannot be parsed into an OAS Document
 * from the uploaded JSON or YAML defintion file.
 *
 * @param fileContent The content of the user-provided API definition file.
 * @returns The parsed OAS object or an error message.
 */
const prepareOas = (fileContent: string): PrepareOasResult => {
  let parsedApiSpec: Oas | undefined;

  try {
    parsedApiSpec = new Oas(fileContent);
  } catch (parseJsonOasError) {
    try {
      const specYaml = yaml.load(fileContent);
      const specJson = JSON.stringify(specYaml);
      parsedApiSpec = new Oas(specJson);
    } catch (parseYamlOasError) {
      return { error: i18n.API_DEFINITION_ERROR.INVALID_OAS };
    }
  }
  return { oas: parsedApiSpec };
};

interface ApiDefinitionInputProps {
  integrationSettings: IntegrationSettings | undefined;
  isGenerating: boolean;
}

export const ApiDefinitionInput = React.memo<ApiDefinitionInputProps>(
  ({ integrationSettings, isGenerating }) => {
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
          apiSpec: undefined,
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

          const prepareResult = prepareOas(fileContent);

          if ('error' in prepareResult) {
            setApiFileError(prepareResult.error);
            return;
          }

          const { oas } = prepareResult;

          setIntegrationSettings({
            ...integrationSettings,
            apiSpec: oas,
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
      <EuiFlexItem fullWidth>
        <EuiText size="s">
          <p>{i18n.OPEN_API_UPLOAD_INSTRUCTIONS}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
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
              fullWidth
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
              isLoading={isParsing || isGenerating}
              data-test-subj="apiDefinitionFilePicker"
              data-loading={isParsing || isGenerating}
            />
          </>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }
);
ApiDefinitionInput.displayName = 'ApiDefinitionInput';
