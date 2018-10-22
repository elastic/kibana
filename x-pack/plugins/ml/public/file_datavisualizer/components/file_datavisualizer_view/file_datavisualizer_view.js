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
  EuiButton,
  EuiPanel,
} from '@elastic/eui';

import { isEqual } from 'lodash';

import { ml } from '../../../services/ml_api_service';
import { AboutPanel } from '../about_panel';
import { ResultsView } from '../results_view';
import { FileCouldNotBeRead, FileTooLarge } from './file_error_callouts';
import { EditFlyout } from '../edit_flyout';
import { ImportView } from '../import_view';
import { MAX_BYTES } from '../../../../common/constants/file_datavisualizer';
import { readFile, createUrlOverrides, processResults } from './utils';

const MODE = {
  READ: 0,
  IMPORT: 1,
};

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
      mode: MODE.READ,
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
      const { analyzeFile } = ml.fileDatavisualizer;
      const resp = await analyzeFile(data, overrides);
      const serverSettings = processResults(resp.results);
      const serverOverrides = resp.overrides;

      this.overrides = {};

      if (serverSettings.format === 'xml') {
        throw {
          message: 'XML not currently supported'
        };
      }

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
        // if any have changed, update the originalSettings value
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

  changeMode = (mode) => {
    this.setState({ mode });
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
      mode,
    } = this.state;

    const fields = (results !== undefined && results.field_stats !== undefined) ? Object.keys(results.field_stats) : [];

    return (
      <React.Fragment>
        {(mode === MODE.READ) &&
          <React.Fragment>
            <div style={{ textAlign: 'center' }} >
              <EuiFilePicker
                id="filePicker"
                initialPromptText="Select or drag and drop a file"
                onChange={files => this.onChange(files)}
              />
            </div>

            <EuiSpacer size="l" />

            {(!loading && !loaded) &&
              <React.Fragment>
                <AboutPanel />
                <EuiSpacer size="l" />
              </React.Fragment>
            }

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
              <React.Fragment>
                <ResultsView
                  results={results}
                  data={fileContents}
                  showEditFlyout={() => this.showEditFlyout()}
                />
              </React.Fragment>
            }
            <EditFlyout
              setShowFunction={this.setShowEditFlyoutFunction}
              setOverrides={this.setOverrides}
              originalSettings={this.originalSettings}
              overrides={this.overrides}
              fields={fields}
            />

            {(loaded) &&
              <React.Fragment>
                <EuiSpacer size="m" />
                <EuiPanel>
                  <EuiButton
                    onClick={() => this.changeMode(MODE.IMPORT)}
                  >
                    Import
                  </EuiButton>
                </EuiPanel>
              </React.Fragment>
            }
          </React.Fragment>
        }
        {(mode === MODE.IMPORT) &&
          <React.Fragment>
            <ImportView
              results={results}
              fileContents={fileContents}
              fileSize={fileSize}
              indexPatterns={this.props.indexPatterns}
            />

            <EuiSpacer size="m" />

            <EuiPanel>
              <EuiButton
                onClick={() => this.changeMode(MODE.READ)}
              >
                Back
              </EuiButton>
            </EuiPanel>
          </React.Fragment>
        }
      </React.Fragment>
    );
  }
}
