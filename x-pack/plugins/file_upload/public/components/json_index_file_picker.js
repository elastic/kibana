/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { useState } from 'react';
import {
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { MAX_BYTES } from '../../common/constants/file_import';

export function JsonIndexFilePicker({
  fileUploadMessage,
  onFileUpload,
  onFileRemove,
  fileRef,
  setFileRef,
  setParsedFile,
  preIndexTransform,
  resetFileAndIndexSettings,
}) {

  const [fileUploadError, setFileUploadError] = useState('');

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
      isInvalid={fileUploadError !== ''}
      error={[fileUploadError]}
    >
      <EuiFilePicker
        initialPromptText={(
          <FormattedMessage
            id="xpack.file_upload.filePicker"
            defaultMessage="Upload file"
          />
        )}
        onChange={async fileList => {
          resetFileAndIndexSettings();
          setFileUploadError('');
          if (fileList.length === 0) { // Remove
            setParsedFile(null);
            onFileRemove && onFileRemove(fileRef);
          } else if (fileList.length === 1) { // Parse & index file
            const file = fileList[0];
            // Check valid size
            if (file.size > MAX_BYTES) {
              setFileUploadError(
                `File size ${file.size} bytes exceeds max file size of ${MAX_BYTES}`
              );
              return;
            }
            // Parse file
            const parsedFileResult = await parseFile(
              file, onFileUpload, preIndexTransform
            ).catch(e => {
              setFileUploadError(`Unable to parse file: ${e}`);
            });
            if (!parsedFileResult) {
              if (fileRef) {
                onFileRemove && onFileRemove(fileRef);
                setFileRef(null);
              }
              return;
            }
            setFileRef(file);
            // Save parsed result
            setParsedFile(parsedFileResult);

          } else { // TODO: Support multiple file upload?
            console.warn('Multiple file upload not currently supported');
          }
        }}
      />
    </EuiFormRow>
  );
}
