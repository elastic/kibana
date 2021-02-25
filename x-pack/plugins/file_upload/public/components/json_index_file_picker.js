/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import { EuiFilePicker, EuiFormRow, EuiProgress } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const MAX_FILE_SIZE = 52428800;
const ACCEPTABLE_FILETYPES = ['json', 'geojson'];
const acceptedFileTypeString = ACCEPTABLE_FILETYPES.map((type) => `.${type}`).join(',');
const acceptedFileTypeStringMessage = ACCEPTABLE_FILETYPES.map((type) => `.${type}`).join(', ');

export class JsonIndexFilePicker extends Component {
  state = {
    fileUploadError: '',
    percentageProcessed: 0,
    featuresProcessed: 0,
    fileParseActive: false,
    currentFileTracker: null,
  };

  async componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  isFileParseActive = () => this._isMounted && this.state.fileParseActive;

  _fileHandler = (fileList) => {
    const fileArr = Array.from(fileList);
    this.props.resetFileAndIndexSettings();
    this.setState({
      fileUploadError: '',
      percentageProcessed: 0,
      featuresProcessed: 0,
    });
    if (fileArr.length === 0) {
      // Remove
      this.setState({
        fileParseActive: false,
      });
      return;
    }
    const file = fileArr[0];

    this.setState(
      {
        fileParseActive: true,
        currentFileTracker: Symbol(),
      },
      () => this._parseFile(file)
    );
  };

  _getFileNameAndCheckType({ name }) {
    let fileNameOnly;
    try {
      if (!name) {
        throw new Error(
          i18n.translate('xpack.fileUpload.jsonIndexFilePicker.noFileNameError', {
            defaultMessage: 'No file name provided',
          })
        );
      }

      const splitNameArr = name.split('.');
      const fileType = splitNameArr.pop();
      if (!ACCEPTABLE_FILETYPES.includes(fileType)) {
        //should only occur if browser does not accept the <File> accept parameter
        throw new Error(
          i18n.translate('xpack.fileUpload.jsonIndexFilePicker.acceptableTypesError', {
            defaultMessage: 'File is not one of acceptable types: {types}',
            values: {
              types: ACCEPTABLE_FILETYPES.join(', '),
            },
          })
        );
      }

      fileNameOnly = splitNameArr[0];
    } catch (error) {
      this.setState({
        fileUploadError: i18n.translate(
          'xpack.fileUpload.jsonIndexFilePicker.fileProcessingError',
          {
            defaultMessage: 'File processing error: {errorMessage}',
            values: {
              errorMessage: error.message,
            },
          }
        ),
      });
      return;
    }
    return fileNameOnly.toLowerCase();
  }

  setFileProgress = ({ featuresProcessed, bytesProcessed, totalBytes }) => {
    const percentageProcessed = parseInt((100 * bytesProcessed) / totalBytes);
    if (this.isFileParseActive()) {
      this.setState({ featuresProcessed, percentageProcessed });
    }
  };

  async _parseFile(file) {
    const { currentFileTracker } = this.state;
    const { setFileRef, setParsedFile, resetFileAndIndexSettings } = this.props;

    if (file.size > MAX_FILE_SIZE) {
      this.setState({
        fileUploadError: i18n.translate('xpack.fileUpload.jsonIndexFilePicker.acceptableFileSize', {
          defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
          values: {
            fileSize: bytesToSize(file.size),
            maxFileSize: bytesToSize(MAX_FILE_SIZE),
          },
        }),
      });
      resetFileAndIndexSettings();
      return;
    }

    const defaultIndexName = this._getFileNameAndCheckType(file);
    if (!defaultIndexName) {
      resetFileAndIndexSettings();
      return;
    }

    const fileResult = await this.props.geojsonImporter
      .readFile(file, this.setFileProgress, this.isFileParseActive)
      .catch((err) => {
        if (this._isMounted) {
          this.setState({
            fileParseActive: false,
            percentageProcessed: 0,
            featuresProcessed: 0,
            fileUploadError: (
              <FormattedMessage
                id="xpack.fileUpload.jsonIndexFilePicker.unableParseFile"
                defaultMessage="Unable to parse file: {error}"
                values={{
                  error: err.message,
                }}
              />
            ),
          });
          resetFileAndIndexSettings();
          return;
        }
      });

    if (!this._isMounted) {
      return;
    }

    // If another file is replacing this one, leave file parse active
    this.setState({
      percentageProcessed: 0,
      featuresProcessed: 0,
      fileParseActive: currentFileTracker !== this.state.currentFileTracker,
    });
    if (!fileResult) {
      resetFileAndIndexSettings();
      return;
    }

    if (fileResult.errors.length) {
      this.setState({
        fileUploadError: (
          <FormattedMessage
            id="xpack.fileUpload.jsonIndexFilePicker.fileParseError"
            defaultMessage="File parse error(s) detected: {error}"
            values={{ error: fileResult.errors[0] }}
          />
        ),
      });
    }
    setFileRef(file);
    setParsedFile(fileResult, defaultIndexName);
  }

  render() {
    const { fileUploadError, percentageProcessed, featuresProcessed } = this.state;

    return (
      <Fragment>
        {percentageProcessed ? (
          <EuiProgress
            value={percentageProcessed}
            max={100}
            size="xs"
            color="accent"
            position="absolute"
          />
        ) : null}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fileUpload.jsonIndexFilePicker.filePickerLabel"
              defaultMessage="Select a file to upload"
            />
          }
          isInvalid={fileUploadError !== ''}
          error={[fileUploadError]}
          helpText={
            percentageProcessed ? (
              i18n.translate('xpack.fileUpload.jsonIndexFilePicker.parsingFile', {
                defaultMessage: '{featuresProcessed} features parsed...',
                values: {
                  featuresProcessed,
                },
              })
            ) : (
              <span>
                {i18n.translate('xpack.fileUpload.jsonIndexFilePicker.formatsAccepted', {
                  defaultMessage: 'Formats accepted: {acceptedFileTypeStringMessage}',
                  values: {
                    acceptedFileTypeStringMessage,
                  },
                })}{' '}
                <br />
                <FormattedMessage
                  id="xpack.fileUpload.jsonIndexFilePicker.maxSize"
                  defaultMessage="Max size: {maxFileSize}"
                  values={{
                    maxFileSize: bytesToSize(MAX_FILE_SIZE),
                  }}
                />
                <br />
                {i18n.translate('xpack.fileUpload.jsonIndexFilePicker.coordinateSystemAccepted', {
                  defaultMessage: 'Coordinates must be in EPSG:4326 coordinate reference system.',
                })}{' '}
              </span>
            )
          }
        >
          <EuiFilePicker
            initialPromptText={
              <FormattedMessage
                id="xpack.fileUpload.jsonIndexFilePicker.filePicker"
                defaultMessage="Upload file"
              />
            }
            onChange={this._fileHandler}
            accept={acceptedFileTypeString}
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
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
