/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, useState } from 'react';
import {
  EuiFilePicker,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { MAX_FILE_SIZE } from '../../common/constants/file_import';

export function JsonIndexFilePicker({
  onFileUpload,
  onFileRemove,
  fileRef,
  setFileRef,
  setParsedFile,
  transformDetails,
  resetFileAndIndexSettings,
}) {

  const [fileUploadError, setFileUploadError] = useState('');

  return (
    <Fragment>
      {
        fileRef
          ? null
          : (
            <EuiCallOut
              title="File upload guidelines"
              iconType="pin"
            >
              <div>
                <ul>
                  <li>Formats accepted: .json, .geojson</li>
                  <li>{`Max size: ${bytesToSize(MAX_FILE_SIZE)}`}</li>
                </ul>
              </div>
            </EuiCallOut>
          )
      }
      <EuiSpacer size="m" />
      <EuiFormRow
        label={(
          <FormattedMessage
            id="xpack.file_upload.filePickerLabel"
            defaultMessage={
              'Please select a file to upload'
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
              if (file.size > MAX_FILE_SIZE) {
                setFileUploadError(
                  `File size ${file.size} bytes exceeds max file size of ${MAX_FILE_SIZE}`
                );
                return;
              }
              setFileRef(file);
              // Parse file
              const parsedFileResult = await parseFile(
                file, onFileUpload, transformDetails
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
              // Save parsed result
              setParsedFile(parsedFileResult);

            } else { // TODO: Support multiple file upload?
              console.warn('Multiple file upload not currently supported');
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
}

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return 'n/a';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}
