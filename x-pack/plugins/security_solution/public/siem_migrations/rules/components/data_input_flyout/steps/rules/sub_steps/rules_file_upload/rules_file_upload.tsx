/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import { parseContent } from './parse_rules_file';
import * as i18n from './translations';

export interface RulesFileUploadProps {
  createMigration: CreateMigration;
  apiError?: string;
  isLoading?: boolean;
  isCreated?: boolean;
}
export const RulesFileUpload = React.memo<RulesFileUploadProps>(
  ({ createMigration, apiError, isLoading, isCreated }) => {
    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [fileError, setFileError] = useState<string>();

    const onChangeFile = useCallback(
      (files: FileList | null) => {
        if (!files) {
          return;
        }

        setFileError(undefined);

        const rulesFile = files[0];
        const reader = new FileReader();

        reader.onloadstart = () => setIsParsing(true);
        reader.onloadend = () => setIsParsing(false);

        reader.onload = function (e) {
          // We can safely cast to string since we call `readAsText` to load the file.
          const fileContent = e.target?.result as string | undefined;

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

          let data: OriginalRule[];
          try {
            data = parseContent(fileContent);
            createMigration(data);
          } catch (err) {
            setFileError(err.message);
          }
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

        reader.readAsText(rulesFile);
      },
      [createMigration]
    );

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    return (
      <EuiFormRow
        helpText={
          <EuiText color="danger" size="xs">
            {error}
          </EuiText>
        }
        isInvalid={error != null}
        fullWidth
      >
        <EuiFilePicker
          id="rulesFilePicker"
          fullWidth
          initialPromptText={
            <>
              <EuiText size="s" textAlign="center">
                {i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT}
              </EuiText>
            </>
          }
          accept="application/json"
          onChange={onChangeFile}
          display="large"
          aria-label="Upload logs sample file"
          isLoading={isParsing || isLoading}
          disabled={isLoading || isCreated}
          data-test-subj="rulesFilePicker"
          data-loading={isParsing}
        />
      </EuiFormRow>
    );
  }
);
RulesFileUpload.displayName = 'RulesFileUpload';
