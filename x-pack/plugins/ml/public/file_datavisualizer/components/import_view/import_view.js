/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiButton,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import { importerFactory } from './importer';
import { ResultsLinks } from '../results_links';
import { ImportProgress, IMPORT_STATUS } from '../import_progress';
import { ImportErrors } from '../import_errors';
import { ImportSummary } from '../import_summary';
import { ImportSettings } from '../import_settings';
import { getIndexPatternNames, refreshIndexPatterns } from '../../../util/index_utils';
import { ml } from '../../../services/ml_api_service';

const DEFAULT_TIME_FIELD = '@timestamp';
const CONFIG_MODE = { SIMPLE: 0, ADVANCED: 1 };

const DEFAULT_STATE = {
  index: '',
  importing: false,
  imported: false,
  initialized: false,
  reading: false,
  readProgress: 0,
  readStatus: IMPORT_STATUS.INCOMPLETE,
  indexCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  indexPatternCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  ingestPipelineCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  uploadProgress: 0,
  uploadStatus: IMPORT_STATUS.INCOMPLETE,
  createIndexPattern: true,
  indexPattern: '',
  indexPatternId: '',
  ingestPipelineId: '',
  errors: [],
  importFailures: [],
  docCount: 0,
  configMode: CONFIG_MODE.SIMPLE,
  indexSettingsString: '',
  mappingsString: '',
  pipelineString: '',
  indexNames: [],
  indexPatternNames: [],
  indexNameError: '',
  indexPatternNameError: '',
};

export class ImportView extends Component {
  constructor(props) {
    super(props);

    this.state = getDefaultState(DEFAULT_STATE, this.props.results);
  }

  componentDidMount() {
    this.loadIndexNames();
    this.loadIndexPatternNames();
  }

  clickReset = () => {
    const state = getDefaultState(this.state, this.props.results);
    this.setState(state, () => {
      this.loadIndexNames();
      this.loadIndexPatternNames();
    });
  }

  clickImport = () => {
    this.import();
  }

  // TODO - sort this function out. it's a mess
  async import() {
    const { fileContents, results } = this.props;
    const { format } = results;
    const {
      index,
      indexPattern,
      createIndexPattern,
      indexSettingsString,
      mappingsString,
      pipelineString,
    } = this.state;

    const errors = [];

    if (index !== '') {
      this.setState({
        importing: true,
        imported: false,
        reading: true,
        initialized: true,
      }, () => {
        this.props.hideBottomBar();
        setTimeout(async () => {
          let success = false;

          let indexCreationSettings = {};
          try {
            indexCreationSettings = {
              settings: JSON.parse(indexSettingsString),
              mappings: JSON.parse(mappingsString),
              pipeline: JSON.parse(pipelineString),
            };
            success = true;
          } catch (error) {
            success = false;
            errors.push(error);
          }

          if (success) {
            const importer = importerFactory(format, results, indexCreationSettings);
            if (importer !== undefined) {

              const readResp = await importer.read(fileContents, this.setReadProgress);
              success = readResp.success;
              this.setState({
                readStatus: success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                reading: false,
              });

              if (readResp.success === false) {
                console.error(readResp.error);
                errors.push(readResp.error);
              }

              if (success) {
                const initializeImportResp = await importer.initializeImport(index);

                const indexCreated = (initializeImportResp.index !== undefined);
                this.setState({
                  indexCreatedStatus: indexCreated ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                });

                const pipelineCreated = (initializeImportResp.pipelineId !== undefined);
                if (indexCreated) {
                  this.setState({
                    ingestPipelineCreatedStatus: pipelineCreated  ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                    ingestPipelineId: pipelineCreated ? initializeImportResp.pipelineId : '',
                  });
                }

                success = (indexCreated && pipelineCreated);

                if (success) {
                  const importId = initializeImportResp.id;
                  const pipelineId = initializeImportResp.pipelineId;
                  const importResp = await importer.import(importId, index, pipelineId, this.setImportProgress);
                  success = importResp.success;
                  this.setState({
                    uploadStatus: importResp.success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                    importFailures: importResp.failures,
                    docCount: importResp.docCount,
                  });

                  if (success && createIndexPattern) {
                    const indexPatternName = (indexPattern === '') ? index : indexPattern;

                    const indexPatternResp = await createKibanaIndexPattern(indexPatternName, this.props.indexPatterns);
                    success = indexPatternResp.success;
                    this.setState({
                      indexPatternCreatedStatus: indexPatternResp.success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                      indexPatternId: indexPatternResp.id,
                    });
                    if (indexPatternResp.success === false) {
                      errors.push(indexPatternResp.error);
                    }
                  } else {
                    errors.push(importResp.error);
                  }
                } else {
                  errors.push(initializeImportResp.error);
                }
              }
            }
          }

          this.props.showBottomBar();
          this.setState({
            importing: false,
            imported: success,
            errors,
          });

        }, 500);
      });
    }
  }

  onConfigModeChange = (configMode) => {
    this.setState({
      configMode,
    });
  }

  onIndexChange = (e) => {
    const name = e.target.value;
    this.setState({
      index: name,
      indexNameError: isIndexNameValid(name, this.state.indexNames),
    });
  }

  onIndexPatternChange = (e) => {
    const name = e.target.value;
    const { indexPatternNames, index } = this.state;
    this.setState({
      indexPattern: name,
      indexPatternNameError: isIndexPatternNameValid(name, indexPatternNames, index),
    });
  }

  onCreateIndexPatternChange = (e) => {
    this.setState({
      createIndexPattern: e.target.checked,
    });
  }

  onIndexSettingsStringChange = (text) => {
    this.setState({
      indexSettingsString: text,
    });
  }

  onMappingsStringChange = (text) => {
    this.setState({
      mappingsString: text,
    });
  }

  onPipelineStringChange = (text) => {
    this.setState({
      pipelineString: text,
    });
  }

  setImportProgress = (progress) => {
    this.setState({
      uploadProgress: progress,
    });
  }

  setReadProgress = (progress) => {
    this.setState({
      readProgress: progress,
    });
  }

  async loadIndexNames() {
    const indices = await ml.getIndices();
    const indexNames = indices.map(i => i.name);
    this.setState({ indexNames });
  }

  async loadIndexPatternNames() {
    await refreshIndexPatterns();
    const indexPatternNames = getIndexPatternNames();
    this.setState({ indexPatternNames });
  }

  render() {
    const {
      index,
      indexPattern,
      indexPatternId,
      ingestPipelineId,
      importing,
      imported,
      reading,
      initialized,
      readStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      indexPatternCreatedStatus,
      uploadProgress,
      uploadStatus,
      createIndexPattern,
      errors,
      docCount,
      importFailures,
      indexSettingsString,
      mappingsString,
      pipelineString,
      indexNameError,
      indexPatternNameError,
    } = this.state;

    const statuses = {
      reading,
      readStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      indexPatternCreatedStatus,
      uploadProgress,
      uploadStatus,
      createIndexPattern,
    };

    const disableImport = (
      index === '' ||
      indexNameError !== '' ||
      (createIndexPattern === true && indexPatternNameError !== '') ||
      initialized === true
    );

    return (
      <React.Fragment>

        <EuiPanel>

          <EuiTitle size="s">
            <h3>Import data</h3>
          </EuiTitle>

          <ImportSettings
            index={index}
            indexPattern={indexPattern}
            initialized={initialized}
            onIndexChange={this.onIndexChange}
            createIndexPattern={createIndexPattern}
            onCreateIndexPatternChange={this.onCreateIndexPatternChange}
            onIndexPatternChange={this.onIndexPatternChange}
            indexSettingsString={indexSettingsString}
            mappingsString={mappingsString}
            pipelineString={pipelineString}
            onIndexSettingsStringChange={this.onIndexSettingsStringChange}
            onMappingsStringChange={this.onMappingsStringChange}
            onPipelineStringChange={this.onPipelineStringChange}
            indexNameError={indexNameError}
            indexPatternNameError={indexPatternNameError}
          />

          <EuiSpacer size="m" />

          {(initialized === false || importing === true) &&

            <EuiButton
              isDisabled={disableImport}
              onClick={this.clickImport}
              isLoading={importing}
              iconSide="right"
              fill
            >
              Import
            </EuiButton>
          }

          {
            (initialized === true && importing === false) &&

            <EuiButton
              onClick={this.clickReset}
            >
              Reset
            </EuiButton>
          }

        </EuiPanel>


        {(initialized === true) &&
          <React.Fragment>
            <EuiSpacer size="m" />

            <EuiPanel>

              <ImportProgress statuses={statuses} />

              {(imported === true) &&
                <React.Fragment>
                  <EuiSpacer size="m" />

                  <ImportSummary
                    index={index}
                    indexPattern={((indexPattern === '') ? index : indexPattern)}
                    ingestPipelineId={ingestPipelineId}
                    docCount={docCount}
                    importFailures={importFailures}
                  />

                  <EuiSpacer size="l" />

                  <ResultsLinks
                    index={(index)}
                    indexPatternId={(indexPatternId)}
                    timeFieldName={DEFAULT_TIME_FIELD}
                  />
                </React.Fragment>
              }

            </EuiPanel>

            {
              (errors.length > 0) &&
              <React.Fragment>
                <EuiSpacer size="m" />

                <ImportErrors
                  errors={errors}
                  statuses={statuses}
                />

              </React.Fragment>
            }
          </React.Fragment>
        }

      </React.Fragment>
    );
  }
}

async function createKibanaIndexPattern(indexPatternName, indexPatterns, timeFieldName = DEFAULT_TIME_FIELD) {
  try {
    const emptyPattern = await indexPatterns.get();

    Object.assign(emptyPattern, {
      id: '',
      title: indexPatternName,
      timeFieldName,
    });

    const id = await emptyPattern.create();
    return {
      success: true,
      id,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error,
    };
  }
}

function getDefaultState(state, results) {
  const indexSettingsString = (state.indexSettingsString === '') ? '{}' : state.indexSettingsString;
  const mappingsString = (state.mappingsString === '') ? JSON.stringify(results.mappings, null, 2) : state.mappingsString;
  const pipelineString = (state.pipelineString === '') ? JSON.stringify(results.ingest_pipeline, null, 2) : state.pipelineString;

  return {
    ... DEFAULT_STATE,
    indexSettingsString,
    mappingsString,
    pipelineString,
  };
}

function isIndexNameValid(name, indexNames) {
  if (indexNames.find(i => i === name)) {
    return 'Index name already exists';
  }

  const reg = new RegExp('[\\\\/\*\?\"\<\>\|\\s\,\#]+');
  if (
    (name !== name.toLowerCase()) || // name should be lowercase
    (name === '.' || name === '..')   || // name can't be . or ..
    name.match(/^[-_+]/) !== null  || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return 'Index name contains illegal characters';
  }
  return '';
}

function isIndexPatternNameValid(name, indexPatternNames, index) {
  // if a blank name is entered, the index name will be used so avoid validation
  if (name === '') {
    return '';
  }

  if (indexPatternNames.find(i => i === name)) {
    return 'Index pattern name already exists';
  }

  // escape . and + to stop the regex matching more than it should.
  let newName = name.replace('.', '\\.');
  newName = newName.replace('+', '\\+');
  // replace * with .* to make the wildcard match work.
  newName = newName.replace('*', '.*');
  const reg = new RegExp(`^${newName}$`);
  if (index.match(reg) === null) { // name should match index
    return 'Index pattern does not match index name';
  }

  return '';
}


