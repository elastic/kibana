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
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { ml } from 'plugins/ml/services/ml_api_service';
import { ResultsView } from '../results_view';


export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
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
      results: undefined,
    }, () => {
      if (files.length) {
        this.analyseFile(files[0]);
      }
    });

  };

  async analyseFile(file) {
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
      }

      if (data !== null) {
        try {
          const resp = await  ml.analyseFile(data);
          this.setState({
            results: resp.results,
            loaded: true,
            loading: false,
            fileTooLarge: false,
            fileCouldNotBeRead: false,
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        this.setState({
          loaded: false,
          loading: false,
          fileCouldNotBeRead: true,
          fileSize: file.size,
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
    return (
      <React.Fragment>
        <div style={{ textAlign: 'center' }} >
          <EuiFilePicker
            id="filePicker"
            initialPromptText="Select or drag and drop a log file"
            onChange={files => this.onChange(files)}
          />
        </div>

        <EuiSpacer size="l" />

        {(this.state.loading) &&
          <div style={{ textAlign: 'center' }} >
            <EuiLoadingSpinner size="xl"/>
          </div>
        }

        {(this.state.fileTooLarge) &&
          <FileTooLarge
            fileSize={this.state.fileSize}
            maxFileSize={this.maxPayloadBytes}
          />
        }

        {(this.state.fileCouldNotBeRead) &&
          <FileCouldNotBeRead />
        }

        {(this.state.loaded) &&
          <ResultsView
            results={this.state.results}
            data={this.state.fileContents}
          />
        }
      </React.Fragment>
    );
  }
}

function FileTooLarge({ fileSize, maxFileSize }) {
  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      <p>
        File size uploaded is {fileSize}, the max file size for uploading to Kibana is {maxFileSize}
      </p>
    </EuiCallOut>
  );
}

function FileCouldNotBeRead() {
  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      <p>
        File could not be read.
      </p>
    </EuiCallOut>
  );
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
