/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, Component } from 'react';
import {
  EuiFilePicker,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
  EuiProgress,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { MAX_FILE_SIZE } from '../../common/constants/file_import';

export class JsonIndexFilePicker extends Component {

  state = {
    fileUploadError: '',
    fileParsingProgress: '',
    fileRef: null
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.fileRef !== this.props.fileRef) {
      this.setState({ fileRef: this.props.fileRef });
    }
  }

  render() {
    const {
      resetFileAndIndexSettings, setParsedFile, onFileRemove, onFileUpload,
      transformDetails, setFileRef, setIndexName
    } = this.props;
    const { fileParsingProgress, fileUploadError, fileRef } = this.state;

    return (
      <Fragment>
        { fileParsingProgress
          ? <EuiProgress size="xs" color="accent" position="absolute" />
          : null
        }
        {
          fileRef && !fileUploadError
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
          helpText={fileParsingProgress}
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
              this.setState({ fileUploadError: '' });
              if (fileList.length === 0) { // Remove
                setParsedFile(null);
                onFileRemove && onFileRemove(fileRef);
              } else if (fileList.length === 1) { // Parse & index file
                const file = fileList[0];
                if (file.name) {
                  const initIndexName = file.name.split('.')[0];
                  setIndexName(initIndexName);
                }
                // Check valid size
                if (file.size > MAX_FILE_SIZE) {
                  this.setState({
                    fileUploadError: `File size ${file.size} bytes exceeds max file size of ${MAX_FILE_SIZE}`
                  });
                  return;
                }
                // Parse file
                this.setState({ fileParsingProgress: 'Parsing file...' });
                const parsedFileResult = await parseFile(
                  file, onFileUpload, transformDetails
                ).catch(e => {
                  this.setState({ fileUploadError: `Unable to parse file: ${e}` });
                });
                this.setState({ fileParsingProgress: '' });
                if (!parsedFileResult) {
                  if (fileRef) {
                    onFileRemove && onFileRemove(fileRef);
                    setFileRef(null);
                  }
                  return;
                }
                setFileRef(file);
                setParsedFile(parsedFileResult);

              } else {
                // No else
              }
            }}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return 'n/a';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}
