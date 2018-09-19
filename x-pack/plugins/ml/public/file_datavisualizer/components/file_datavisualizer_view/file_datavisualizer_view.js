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

import { isEqual } from 'lodash';

import { ml } from '../../../services/ml_api_service';
import { ResultsView } from '../results_view';
import { FileCouldNotBeRead, FileTooLarge } from './file_error_callouts';
import { EditFlyout } from '../edit_flyout';
import { overrideDefaults } from './overrides';
import { MAX_BYTES } from '../../../../common/constants/file_datavisualizer';

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

    this.overrides = {};
    this.originalSettings = {};
    this.showEditFlyout = () => {};
  }

  onChange = (files) => {
    this.overrides = {};

    this.setState({
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
    if (file.size < MAX_BYTES) {
      try {
        const fileContents = await readFile(file);
        const data = fileContents.data;
        this.setState({
          fileContents: data,
          fileSize: file.size,
        });

        await this.loadSettings(data);

      } catch (error) {
        console.error(error);
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

  async loadSettings(data, overrides) {
    try {
      console.log('overrides', overrides);
      const resp = await  ml.analyzeFile(data, overrides);
      const serverSettings = processResults(resp.results);
      const serverOverrides = resp.overrides;

      this.overrides = {};

      if (serverOverrides === undefined) {
        this.originalSettings = serverSettings;
      } else {
        for (const o in serverOverrides) {
          if (serverOverrides.hasOwnProperty(o)) {
            const camelCaseO = o.replace(/_\w/g, m => m[1].toUpperCase());
            this.overrides[camelCaseO] = serverOverrides[o];
          }
        }

        // check to see if the settings from the server which haven't been overridden have changed.
        // e.g. changing the name of the time field which is also the time field
        // will cause the timestamp_field setting to change.
        // if any have change, update the originalSettings value
        for (const o in serverSettings) {
          if (serverSettings.hasOwnProperty(o)) {
            const value = serverSettings[o];
            if (
              this.overrides[o] === undefined &&
              (Array.isArray(value) && (isEqual(value, this.originalSettings[o]) === false) ||
              (value !== this.originalSettings[o]))
            ) {
              this.originalSettings[o] = value;
            }
          }
        }
      }

      this.setState({
        results: resp.results,
        loaded: true,
        loading: false,
      });
    } catch (error) {
      console.error(error);
      this.setState({
        results: undefined,
        loaded: false,
        loading: false,
        fileCouldNotBeRead: true,
        serverErrorMessage: error.message,
      });
    }
  }

  setShowEditFlyoutFunction = (func) => {
    this.showEditFlyout = func;
  }
  unsetShowEditFlyoutFunction = () => {
    this.showEditFlyout = () => {};
  }

  setOverrides = (overrides) => {
    console.log('setOverrides', overrides);
    this.setState({
      loading: true,
      loaded: false,
    }, () => {
      const formattedOverrides = createUrlOverrides(overrides, this.originalSettings);
      this.loadSettings(this.state.fileContents, formattedOverrides);
    });
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

    const fields = (results !== undefined && results.field_stats !== undefined) ? Object.keys(results.field_stats) : [];

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
            maxFileSize={MAX_BYTES}
          />
        }

        {(fileCouldNotBeRead) &&
          <FileCouldNotBeRead error={serverErrorMessage} />
        }

        {(loaded) &&
          <ResultsView
            results={results}
            data={fileContents}
            showEditFlyout={() => this.showEditFlyout()}
          />
        }
        <EditFlyout
          setShowFunction={this.setShowEditFlyoutFunction}
          setOverrides={this.setOverrides}
          originalSettings={this.originalSettings}
          overrides={this.overrides}
          fields={fields}
        />
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

function createUrlOverrides(overrides, originalSettings) {
  const formattedOverrides = {};
  for (const o in overrideDefaults) {
    if (overrideDefaults.hasOwnProperty(o)) {
      let value = overrides[o];
      if (
        (Array.isArray(value) && isEqual(value, originalSettings[o]) ||
        (value === undefined || value === originalSettings[o]))
      ) {
        value = '';
      }

      const snakeCaseO = o.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
      formattedOverrides[snakeCaseO] = value;
    }
  }

  if (formattedOverrides.format === '' && originalSettings.format === 'delimited') {
    if (
      formattedOverrides.should_trim_fields !== '' ||
      formattedOverrides.has_header_row !== '' ||
      formattedOverrides.delimiter !== '' ||
      formattedOverrides.quote !== '' ||
      formattedOverrides.column_names !== ''
    ) {
      formattedOverrides.format = originalSettings.format;
    }
  }

  if (formattedOverrides.format === 'json' || originalSettings.format === 'json') {
    formattedOverrides.should_trim_fields = '';
    formattedOverrides.has_header_row = '';
    formattedOverrides.delimiter = '';
    formattedOverrides.quote = '';
    formattedOverrides.column_names = '';
  }

  return formattedOverrides;
}

function processResults(results) {
  let timestampFormat = results.timestamp_format;
  if (
    timestampFormat === undefined &&
    results.timestamp_formats !== undefined &&
    results.timestamp_formats.length
  ) {
    timestampFormat = results.timestamp_formats[0];
  }

  return {
    format: results.format,
    delimiter: results.delimiter,
    timestampField: results.timestamp_field,
    timestampFormat,
    quote: '"', //results.quote,
    hasHeaderRow: results.has_header_row,
    shouldTrimFields: results.should_trim_fields,
    charset: results.charset,
    columnNames: results.column_names,
    grokPattern: results.grok_pattern,
  };
}
