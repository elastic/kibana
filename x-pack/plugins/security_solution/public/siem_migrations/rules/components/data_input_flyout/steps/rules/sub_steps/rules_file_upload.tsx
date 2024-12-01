/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import { isPlainObject } from 'lodash/fp';
import type { OriginalRuleAnnotations } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { OriginalRule } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from '../translations';
import type { SubStepProps } from '../../../types';
import type { SPL_RULES_COLUMNS } from '../../../constants';

type ExpectedRowFormat = Partial<Record<(typeof SPL_RULES_COLUMNS)[number], string>>;

const parseContent = (fileContent: string): OriginalRule[] => {
  const trimmedContent = fileContent.trim();
  let arrayContent: ExpectedRowFormat[];
  if (trimmedContent.startsWith('[')) {
    arrayContent = parseJSONArray(trimmedContent);
  } else {
    arrayContent = parseNDJSON(trimmedContent);
  }
  if (arrayContent.length === 0) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.EMPTY);
  }
  return arrayContent.map(convertFormat);
};

const parseNDJSON = (fileContent: string): ExpectedRowFormat[] => {
  return fileContent
    .split(/\n(?=\{)/) // split at newline followed by '{'.
    .filter((entry) => entry.trim() !== '') // Remove empty entries.
    .map((entry) => JSON.parse(entry)); // Parse each entry as JSON.
};

const parseJSONArray = (fileContent: string): ExpectedRowFormat[] => {
  let parsedContent: ExpectedRowFormat;
  try {
    parsedContent = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
    }
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.CAN_NOT_PARSE);
  }
  if (!Array.isArray(parsedContent)) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.NOT_ARRAY);
  }
  return parsedContent;
};

const convertFormat = (row: ExpectedRowFormat): OriginalRule => {
  if (!isPlainObject(row)) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  const originalRule: Partial<OriginalRule> = {
    id: row.id,
    vendor: 'splunk',
    title: row.title,
    query: row.search,
    query_language: 'spl',
    description: row['action.escu.eli5'] || row.description,
  };

  if (row['action.correlationsearch.annotations']) {
    originalRule.annotations = processAnnotations(row['action.correlationsearch.annotations']);
  }
  // Validates each rule format.
  const { error } = OriginalRule.safeParse(originalRule);
  if (error) {
    throw new Error(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.WRONG_FORMAT(error.message));
  }
  return originalRule as OriginalRule;
};

const processAnnotations = (annotationsStr: string): OriginalRuleAnnotations | undefined => {
  try {
    return JSON.parse(annotationsStr);
  } catch (error) {
    return undefined;
  }
};

export const RulesFileUpload = React.memo<SubStepProps>(({ onComplete }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [fileError, setFileError] = useState<string>();

  const onChangeFile = useCallback((files: FileList | null) => {
    if (!files) {
      return;
    }

    setFileError(undefined);

    const logsSampleFile = files[0];
    const reader = new FileReader();

    reader.onloadstart = () => setIsParsing(true);
    reader.onloadend = () => setIsParsing(false);

    reader.onload = function (e) {
      const fileContent = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsText` to load the file.

      if (fileContent == null) {
        setFileError(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.CAN_NOT_READ);
        return;
      }

      if (fileContent === '' && e.loaded > 100000) {
        // V8-based browsers can't handle large files and return an empty string
        // instead of an error; see https://stackoverflow.com/a/61316641
        setFileError(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
        return;
      }

      let data: object[];
      try {
        data = parseContent(fileContent);
      } catch (error) {
        setFileError(error);
      }

      // TODO: Create a new migration using data

      // setIntegrationSettings({
      //   ...integrationSettings,
      //   logSamples,
      //   samplesFormat,
      // });
    };

    const handleReaderError = function () {
      const message = reader.error?.message;
      if (message) {
        setFileError(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message));
      } else {
        setFileError(i18n.RULES_DATA_INPUT_FILE_UPLOAD_ERROR.CAN_NOT_READ);
      }
    };

    reader.onerror = handleReaderError;
    reader.onabort = handleReaderError;

    reader.readAsText(logsSampleFile);
  }, []);

  return (
    <EuiFormRow
      helpText={
        <EuiText color="danger" size="xs">
          {fileError}
        </EuiText>
      }
      isInvalid={fileError != null}
    >
      <EuiFilePicker
        id="logsSampleFilePicker"
        initialPromptText={
          <>
            <EuiText size="s" textAlign="center">
              {i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT}
            </EuiText>
          </>
        }
        onChange={onChangeFile}
        display="large"
        aria-label="Upload logs sample file"
        isLoading={isParsing}
        data-test-subj="logsSampleFilePicker"
        data-loading={isParsing}
      />
    </EuiFormRow>
  );
});
RulesFileUpload.displayName = 'RulesFileUpload';
