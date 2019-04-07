/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { triggerIndexing } from '../util/indexing_service';
import _ from 'lodash';

export function JsonUploadAndParse({
  boolIndexData = false,
  indexDescription,
  fileUploadMessage,
  onFileUpload,
  onFileRemove,
  postParseJsonTransform,
  onIndexAddSuccess,
  onIndexAddError,
}) {

  // Local state for parsed and indexed files
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);

  if (boolIndexData && !_.isEqual(indexedFile, parsedFile)) {
    triggerIndexing(parsedFile, indexDescription).then(resp => {
      if (resp.success) {
        setIndexedFile(parsedFile);
        onIndexAddSuccess && onIndexAddSuccess(resp);
      } else {
        setIndexedFile(null);
        onIndexAddError && onIndexAddError();
      }
    });
  }

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
            setFileRef(file);
            // Parse file
            const parsedFileResult = await parseFile(
              file, onFileUpload, postParseJsonTransform
            );
            // Immediately index file if flag set
            if (file && boolIndexData) {
              await triggerIndexing(parsedFileResult).then(resp => {
                if (resp.success) {
                  setIndexedFile(parsedFile);
                  onIndexAddSuccess && onIndexAddSuccess(resp);
                } else {
                  setIndexedFile(null);
                  onIndexAddError && onIndexAddError();
                }
              });
            }
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

JsonUploadAndParse.propTypes = {
  boolIndexData: PropTypes.bool,
  indexDescription: PropTypes.object,
  fileUploadMessage: PropTypes.string,
  onFileUpload: PropTypes.func,
  onFileRemove: PropTypes.func,
  postParseJsonTransform: PropTypes.func,
  onIndexAddSuccess: PropTypes.func,
  onIndexAddError: PropTypes.func,
};
