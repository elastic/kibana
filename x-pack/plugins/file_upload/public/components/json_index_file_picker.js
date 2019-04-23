/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import {
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { triggerIndexing } from '../util/indexing_service';
import { toastNotifications } from 'ui/notify';

export function JsonIndexFilePicker({
  boolIndexData = false,
  fileUploadMessage,
  onFileUpload,
  onFileRemove,
  onIndexAddSuccess,
  onIndexAddError,
  fileRef,
  setFileRef,
  parsedFile,
  setParsedFile,
  setIndexedFile,
  preIndexTransform,
  indexName,
  indexDataType,
}) {

  return (
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.file_upload.filePickerLabel"
          defaultMessage={
            fileUploadMessage || 'Please select a Json file to upload'
          }
        />
      )}
    >
      <EuiFilePicker
        initialPromptText={(
          <FormattedMessage
            id="xpack.file_upload.filePicker"
            defaultMessage="Upload file"
          />
        )}
        onChange={async fileList => {
          if (fileList.length === 0) { // Remove
            setParsedFile(null);
            onFileRemove && onFileRemove(fileRef);
          } else if (fileList.length === 1) { // Parse & index file
            const file = fileList[0];
            // Parse file
            const parsedFileResult = await parseFile(
              file, onFileUpload, preIndexTransform
            ).catch(e => {
              toastNotifications.addDanger(`Unable to parse file: ${e}`);
            });
            setFileRef(file);
            // Save parsed result
            setParsedFile(parsedFileResult);

            // Immediately index file if flag set
            if (file && boolIndexData) {
              await triggerIndexing(parsedFile, preIndexTransform, indexName, indexDataType)
                .then(
                  resp => {
                    if (resp.success) {
                      setIndexedFile(parsedFile);
                      onIndexAddSuccess && onIndexAddSuccess(resp);
                    } else {
                      setIndexedFile(null);
                      onIndexAddError && onIndexAddError();
                    }
                  });
            }
          } else { // TODO: Support multiple file upload?
            console.warn('Multiple file upload not currently supported');
          }
        }}
      />
    </EuiFormRow>
  );
}
