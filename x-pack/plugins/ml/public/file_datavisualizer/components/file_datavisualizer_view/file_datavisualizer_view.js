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

    this.overrides = {
      ...overrideDefaults
    };

    this.defaultSettings = {};

    this.maxPayloadBytes = this.props.maxPayloadBytes;
    this.showEditFlyout = () => {};
  }

  onChange = (files) => {
    this.overrides = {
      ...overrideDefaults
    };

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

      await this.findSettings(data);
    } else {
      this.setState({
        loaded: false,
        loading: false,
        fileTooLarge: true,
        fileSize: file.size,
      });
    }
  }

  async findSettings(data) {
    if (data !== null) {
      try {
        const overrides = this.createUrlOverrides();
        console.log('overrides', overrides);
        const resp = await  ml.analyzeFile(data, overrides);

        if (resp.hasOverrides === false) {
          this.setDefaultSettings(resp.results);
        }
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
  }

  setShowEditFlyoutFunction = (func) => {
    this.showEditFlyout = func;
  }
  unsetShowEditFlyoutFunction = () => {
    this.showEditFlyout = () => {};
  }


  setDefaultSettings(results) {
    let timestampFormat = results.timestamp_format;
    if (
      timestampFormat === undefined &&
      results.timestamp_formats !== undefined &&
      results.timestamp_formats.length
    ) {
      timestampFormat = results.timestamp_formats[0];
    }

    this.defaultSettings = {
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

  createUrlOverrides() {
    const formattedOverrides = {};
    for (const o in this.overrides) {
      if (this.overrides.hasOwnProperty(o)) {
        let value = this.overrides[o];
        if (
          (Array.isArray(value) && isEqual(value, this.defaultSettings[o]) ||
          (value === null || value === this.defaultSettings[o]))
        ) {
          value = '';
        }

        const snakeCaseO = o.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
        formattedOverrides[snakeCaseO] = value;
      }
    }
    return formattedOverrides;
  }

  setOverrides = (overrides) => {
    console.log(overrides);
    this.overrides = overrides;
    this.findSettings(this.state.fileContents);
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
            showEditFlyout={() => this.showEditFlyout()}
          />
        }
        <EditFlyout
          setShowFunction={this.setShowEditFlyoutFunction}
          setOverrides={this.setOverrides}
          defaultSettings={this.defaultSettings}
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
