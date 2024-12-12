/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import type { RuleMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { FILE_UPLOAD_ERROR } from '../../../../translations';
import * as i18n from './translations';

export interface LookupsFileUploadProps {
  createResources: (resources: RuleMigrationResourceData[]) => void;
  apiError?: string;
  isLoading?: boolean;
}
export const LookupsFileUpload = React.memo<LookupsFileUploadProps>(
  ({ createResources, apiError, isLoading }) => {
    const [lookupResources, setLookupResources] = useState<RuleMigrationResourceData[]>([]);

    const onFileLoaded = useCallback((name: string, content: string) => {
      setLookupResources((current) => [...current, { type: 'list', name, content }]);
    }, []);

    const createLookups = useCallback(() => {
      createResources(lookupResources);
    }, [createResources, lookupResources]);

    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [fileError, setError] = useState<string>();

    const parseFile = useCallback(
      async (files: FileList | null) => {
        if (!files) {
          return;
        }

        setError(undefined);

        for (const file of files) {
          const reader = new FileReader();

          reader.onloadstart = () => setIsParsing(true);
          reader.onloadend = () => setIsParsing(false);

          reader.onload = function (e) {
            // We can safely cast to string since we call `readAsText` to load the file.
            const fileContent = e.target?.result as string | undefined;

            if (fileContent == null) {
              setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
              return;
            }

            if (fileContent === '' && e.loaded > 100000) {
              // V8-based browsers can't handle large files and return an empty string
              // instead of an error; see https://stackoverflow.com/a/61316641
              setError(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
              return;
            }

            try {
              onFileLoaded(file.name, fileContent);
            } catch (err) {
              setError(err.message);
            }
          };

          const handleReaderError = function () {
            const message = reader.error?.message;
            if (message) {
              setError(FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message));
            } else {
              setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
            }
          };

          reader.onerror = handleReaderError;
          reader.onabort = handleReaderError;

          reader.readAsText(file);
        }
      },
      [onFileLoaded]
    );

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
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
              id="lookupsFilePicker"
              fullWidth
              initialPromptText={
                <>
                  <EuiText size="s" textAlign="center">
                    {i18n.LOOKUPS_DATA_INPUT_FILE_UPLOAD_PROMPT}
                  </EuiText>
                </>
              }
              accept="application/text"
              onChange={parseFile}
              multiple
              display="large"
              aria-label="Upload lookups files"
              isLoading={isParsing || isLoading}
              disabled={isParsing || isLoading}
              data-test-subj="lookupsFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={createLookups} isLoading={isLoading} color="success">
                {'upload IT!'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
LookupsFileUpload.displayName = 'LookupsFileUpload';
