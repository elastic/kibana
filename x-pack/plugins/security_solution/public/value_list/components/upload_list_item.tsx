/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiFilePicker, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/css';
import { useImportList, useInvalidateListItemQuery } from '@kbn/securitysolution-list-hooks';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';
import { useKibana } from '../../common/lib/kibana';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

const validFileTypes = ['text/csv', 'text/plain'];

const toastOptions = {
  toastLifeTimeMs: 5000,
};

const uploadStyle = css`
  min-width: 300px;
`;

export const UploadListItem = ({ listId, type }: { listId: string; type: Type }) => {
  const [file, setFile] = useState<File | null>(null);
  const { http } = useKibana().services;
  const ctrl = useRef(new AbortController());
  const { start: importList, ...importState } = useImportList();
  const invalidateListItemQuery = useInvalidateListItemQuery();
  const { addSuccess, addError } = useAppToasts();
  const handleFileChange = useCallback((files: FileList | null) => {
    setFile(files?.item(0) ?? null);
  }, []);

  const handleImport = useCallback(() => {
    if (!importState.loading && file) {
      ctrl.current = new AbortController();
      importList({
        file,
        listId,
        http,
        signal: ctrl.current.signal,
        type: 'keyword',
        refresh: true,
      });
    }
  }, [importState.loading, file, importList, http, type]);

  const fileIsValid = !file || validFileTypes.some((fileType) => file.type === fileType);

  useEffect(() => {
    if (!importState.loading && importState.result) {
      addSuccess('Succesfully upload list items', toastOptions);
      console.log(importState.result);
    } else if (!importState.loading && importState.error) {
      addError('Failed to upload list item', {
        title: 'error',
        ...toastOptions,
      });
      console.log(importState.error as Error);
    }
    invalidateListItemQuery();
  }, [importState.error, importState.loading, importState.result]);

  return (
    <>
      <EuiToolTip position="bottom" content="All items from file will be added as new items">
        <EuiFilePicker
          className={uploadStyle}
          accept={validFileTypes.join()}
          id="value-list-item-upload"
          initialPromptText="Select or drag and drop multiple files"
          onChange={handleFileChange}
          display="default"
          isLoading={importState.loading}
          isInvalid={!fileIsValid}
        />
      </EuiToolTip>
      <EuiButton
        onClick={handleImport}
        disabled={file == null || !fileIsValid || importState.loading}
      >
        Upload
      </EuiButton>
    </>
  );
};
