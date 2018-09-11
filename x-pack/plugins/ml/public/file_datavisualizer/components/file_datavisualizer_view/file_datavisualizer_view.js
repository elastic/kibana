/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiFilePicker,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';
import { ResultsView } from '../results_view';
import { FileCouldNotBeRead, FileTooLarge } from './file_error_callouts';


export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverErrorMessage: '',
      loading: false,
      loaded: false,
      results: undefined,
    };

    this.maxPayloadBytes = this.props.maxPayloadBytes;
  }

  onChange = (files) => {
    this.setState({
      files,
      loading: (files.length > 0),
      loaded: false,
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverErrorMessage: '',
      results: undefined,
    }, () => {
      if (files.length) {
        this.analyzeFile(files[0]);
      }
    });

  };

  async analyzeFile(file) {
    if (file.size < this.maxPayloadBytes) {
      let data = null;
      try {
        const fileContents = await readFile(file);
        data = fileContents.data;
        this.setState({
          fileContents: data,
          fileSize: file.size,
        });

      } catch (error) {
        console.error(error);
        this.setState({
          loaded: false,
          loading: false,
          fileCouldNotBeRead: true,
        });
      }

      if (data !== null) {
        try {
          const resp = await  ml.analyzeFile(data);
          this.setState({
            results: resp.results,
            loaded: true,
            loading: false,
          });
        } catch (error) {
          console.error(error);
          const msg = (error.message || '').split('::')[0];
          this.setState({
            results: undefined,
            loaded: false,
            loading: false,
            fileCouldNotBeRead: true,
            serverErrorMessage: msg,
          });
        }
      } else {
        this.setState({
          loaded: false,
          loading: false,
          fileCouldNotBeRead: true,
        });
      }
    } else {
      this.setState({
        loaded: false,
        loading: false,
        fileTooLarge: true,
        fileSize: file.size,
      });
    }
  }

  render() {
    const {
      loading,
      loaded,
      results,
      fileContents,
      fileSize,
      fileTooLarge,
      fileCouldNotBeRead,
      serverErrorMessage,
    } = this.state;

    return (
      <React.Fragment>
        <div style={{ textAlign: 'center' }} >
          <EuiFilePicker
            id="filePicker"
            initialPromptText="Select or drag and drop a file"
            onChange={files => this.onChange(files)}
          />
        </div>

        <EuiSpacer size="l" />

        {(loading) &&
          <div style={{ textAlign: 'center' }} >
            <EuiLoadingSpinner size="xl"/>
          </div>
        }

        {(fileTooLarge) &&
          <FileTooLarge
            fileSize={fileSize}
            maxFileSize={this.maxPayloadBytes}
          />
        }

        {(fileCouldNotBeRead) &&
          <FileCouldNotBeRead error={serverErrorMessage} />
        }

        {(loaded) &&
          <ResultsView
            results={results}
            data={fileContents}
          />
        }
      </React.Fragment>
    );
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {

    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (data === '') {
            reject();
          } else {
            resolve({ data });
          }
        };
      })(file);
    } else {
      reject();
    }
  });
}
