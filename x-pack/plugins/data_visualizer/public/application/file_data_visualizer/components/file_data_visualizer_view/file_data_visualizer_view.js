/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { isEqual } from 'lodash';

import { AboutPanel, LoadingPanel } from '../about_panel';
import { BottomBar } from '../bottom_bar';
import { ResultsView } from '../results_view';
import {
  FileCouldNotBeRead,
  FileTooLarge,
  FindFileStructurePermissionDenied,
} from './file_error_callouts';
import { EditFlyout } from '../edit_flyout';
import { ExplanationFlyout } from '../explanation_flyout';
import { ImportView } from '../import_view';
import {
  DEFAULT_LINES_TO_SAMPLE,
  readFile,
  createUrlOverrides,
  processResults,
} from '../../../common/components/utils';

import { Chat } from '../../../../../../cloud/public';

import { MODE } from './constants';

export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileName: '',
      fileContents: '',
      data: [],
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverError: null,
      loading: false,
      loaded: false,
      results: undefined,
      explanation: undefined,
      mode: MODE.READ,
      isEditFlyoutVisible: false,
      isExplanationFlyoutVisible: false,
      bottomBarVisible: false,
      hasPermissionToImport: false,
      fileCouldNotBeReadPermissionError: false,
    };

    this.overrides = {};
    this.previousOverrides = {};
    this.originalSettings = {
      linesToSample: DEFAULT_LINES_TO_SAMPLE,
    };

    this.savedObjectsClient = props.savedObjectsClient;
    this.maxFileUploadBytes = props.fileUpload.getMaxBytes();
  }

  async componentDidMount() {
    // check the user has the correct permission to import data.
    // note, calling hasImportPermission with no arguments just checks the
    // cluster privileges, the user will still need index privileges to create and ingest
    const hasPermissionToImport = await this.props.fileUpload.hasImportPermission({
      checkCreateIndexPattern: false,
      checkHasManagePipeline: true,
    });
    this.setState({ hasPermissionToImport });
  }

  onFilePickerChange = (files) => {
    this.overrides = {};

    this.setState(
      {
        loading: files.length > 0,
        bottomBarVisible: files.length > 0,
        loaded: false,
        fileName: '',
        fileContents: '',
        data: [],
        fileSize: 0,
        fileTooLarge: false,
        fileCouldNotBeRead: false,
        fileCouldNotBeReadPermissionError: false,
        serverError: null,
        results: undefined,
        explanation: undefined,
      },
      () => {
        if (files.length) {
          this.loadFile(files[0]);
        }
      }
    );
  };

  async loadFile(file) {
    if (file.size <= this.maxFileUploadBytes) {
      try {
        const { data, fileContents } = await readFile(file);
        this.setState({
          data,
          fileContents,
          fileName: file.name,
          fileSize: file.size,
        });

        await this.analyzeFile(fileContents);
      } catch (error) {
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
        fileName: file.name,
        fileSize: file.size,
      });
    }
  }

  async analyzeFile(fileContents, overrides, isRetry = false) {
    try {
      const resp = await this.props.fileUpload.analyzeFile(fileContents, overrides);
      const serverSettings = processResults(resp);
      const serverOverrides = resp.overrides;

      this.previousOverrides = overrides;
      this.overrides = {};

      if (serverSettings.format === 'xml') {
        throw {
          message: (
            <FormattedMessage
              id="xpack.dataVisualizer.file.xmlNotCurrentlySupportedErrorMessage"
              defaultMessage="XML not currently supported"
            />
          ),
        };
      }

      if (serverOverrides === undefined) {
        // if no overrides were used, store all the settings returned from the endpoint
        this.originalSettings = serverSettings;
      } else {
        Object.keys(serverOverrides).forEach((o) => {
          const camelCaseO = o.replace(/_\w/g, (m) => m[1].toUpperCase());
          this.overrides[camelCaseO] = serverOverrides[o];
        });

        // check to see if the settings from the server which haven't been overridden have changed.
        // e.g. changing the name of the time field which is also the time field
        // will cause the timestamp_field setting to change.
        // if any have changed, update the originalSettings value
        Object.keys(serverSettings).forEach((o) => {
          const value = serverSettings[o];
          if (
            this.overrides[o] === undefined &&
            ((Array.isArray(value) && isEqual(value, this.originalSettings[o]) === false) ||
              value !== this.originalSettings[o])
          ) {
            this.originalSettings[o] = value;
          }
        });
      }

      this.setState({
        results: resp.results,
        explanation: resp.explanation,
        loaded: true,
        loading: false,
        fileCouldNotBeRead: isRetry,
      });
    } catch (error) {
      const fileCouldNotBeReadPermissionError = error.body.statusCode === 403;
      this.setState({
        results: undefined,
        explanation: undefined,
        loaded: false,
        loading: false,
        fileCouldNotBeRead: true,
        fileCouldNotBeReadPermissionError,
        serverError: error,
      });

      // reload the results with the previous overrides
      if (isRetry === false && fileCouldNotBeReadPermissionError === false) {
        this.setState({
          loading: true,
          loaded: false,
        });
        this.analyzeFile(fileContents, this.previousOverrides, true);
      }
    }
  }

  closeEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: false });
    this.showBottomBar();
  };

  showEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: true });
    this.hideBottomBar();
  };

  closeExplanationFlyout = () => {
    this.setState({ isExplanationFlyoutVisible: false });
    this.showBottomBar();
  };

  showExplanationFlyout = () => {
    this.setState({ isExplanationFlyoutVisible: true });
    this.hideBottomBar();
  };

  showBottomBar = () => {
    this.setState({ bottomBarVisible: true });
  };

  hideBottomBar = () => {
    this.setState({ bottomBarVisible: false });
  };

  setOverrides = (overrides) => {
    this.setState(
      {
        loading: true,
        loaded: false,
      },
      () => {
        const formattedOverrides = createUrlOverrides(overrides, this.originalSettings);
        this.analyzeFile(this.state.fileContents, formattedOverrides);
      }
    );
  };

  changeMode = (mode) => {
    this.setState({ mode });
  };

  onCancel = () => {
    this.overrides = {};
    this.previousOverrides = {};
    this.originalSettings = {
      linesToSample: DEFAULT_LINES_TO_SAMPLE,
    };
    this.changeMode(MODE.READ);
    this.onFilePickerChange([]);
  };

  render() {
    const {
      loading,
      loaded,
      results,
      explanation,
      fileContents,
      data,
      fileName,
      fileSize,
      fileTooLarge,
      fileCouldNotBeRead,
      serverError,
      mode,
      isEditFlyoutVisible,
      isExplanationFlyoutVisible,
      bottomBarVisible,
      hasPermissionToImport,
      fileCouldNotBeReadPermissionError,
    } = this.state;

    const fields =
      results !== undefined && results.field_stats !== undefined
        ? Object.keys(results.field_stats)
        : [];

    return (
      <div>
        {mode === MODE.READ && (
          <>
            {!loading && !loaded && <AboutPanel onFilePickerChange={this.onFilePickerChange} />}

            {loading && <LoadingPanel />}

            {fileTooLarge && (
              <FileTooLarge fileSize={fileSize} maxFileSize={this.maxFileUploadBytes} />
            )}

            {fileCouldNotBeRead && loading === false && (
              <>
                {fileCouldNotBeReadPermissionError ? (
                  <FindFileStructurePermissionDenied />
                ) : (
                  <FileCouldNotBeRead
                    error={serverError}
                    loaded={loaded}
                    showEditFlyout={this.showEditFlyout}
                  />
                )}
                <EuiSpacer size="l" />
              </>
            )}

            {loaded && (
              <ResultsView
                results={results}
                explanation={explanation}
                fileName={fileName}
                data={fileContents}
                showEditFlyout={this.showEditFlyout}
                showExplanationFlyout={this.showExplanationFlyout}
                disableButtons={isEditFlyoutVisible || isExplanationFlyoutVisible}
              />
            )}
            <EditFlyout
              setOverrides={this.setOverrides}
              closeEditFlyout={this.closeEditFlyout}
              isFlyoutVisible={isEditFlyoutVisible}
              originalSettings={this.originalSettings}
              overrides={this.overrides}
              fields={fields}
            />

            {isExplanationFlyoutVisible && (
              <ExplanationFlyout results={results} closeFlyout={this.closeExplanationFlyout} />
            )}

            {bottomBarVisible && loaded && (
              <>
                <BottomBar
                  mode={MODE.READ}
                  onChangeMode={this.changeMode}
                  onCancel={this.onCancel}
                  disableImport={hasPermissionToImport === false}
                />
                <BottomPadding />
              </>
            )}
          </>
        )}
        {mode === MODE.IMPORT && (
          <>
            <ImportView
              results={results}
              fileName={fileName}
              fileContents={fileContents}
              data={data}
              dataViewsContract={this.props.dataViewsContract}
              showBottomBar={this.showBottomBar}
              hideBottomBar={this.hideBottomBar}
              savedObjectsClient={this.savedObjectsClient}
              fileUpload={this.props.fileUpload}
              resultsLinks={this.props.resultsLinks}
              capabilities={this.props.capabilities}
            />

            {bottomBarVisible && (
              <>
                <BottomBar
                  mode={MODE.IMPORT}
                  onChangeMode={this.changeMode}
                  onCancel={this.onCancel}
                />
                <BottomPadding />
              </>
            )}
          </>
        )}
        <Chat />
      </div>
    );
  }
}

function BottomPadding() {
  // padding for the BottomBar
  return (
    <>
      <EuiSpacer size="m" />
      <EuiSpacer size="l" />
      <EuiSpacer size="l" />
    </>
  );
}
