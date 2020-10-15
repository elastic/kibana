/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContentHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { importerFactory } from './importer';
import { ResultsLinks } from '../results_links';
import { FilebeatConfigFlyout } from '../filebeat_config_flyout';
import { ImportProgress, IMPORT_STATUS } from '../import_progress';
import { ImportErrors } from '../import_errors';
import { ImportSummary } from '../import_summary';
import { ImportSettings } from '../import_settings';
import {
  addCombinedFieldsToPipeline,
  addCombinedFieldsToMappings,
  getDefaultCombinedFields,
} from '../combined_fields';
import { ExperimentalBadge } from '../experimental_badge';
import { getIndexPatternNames, loadIndexPatterns } from '../../../../util/index_utils';
import { ml } from '../../../../services/ml_api_service';
import { hasImportPermission } from '../utils';

const DEFAULT_TIME_FIELD = '@timestamp';
const DEFAULT_INDEX_SETTINGS = { number_of_shards: 1 };
const CONFIG_MODE = { SIMPLE: 0, ADVANCED: 1 };

const DEFAULT_STATE = {
  index: '',
  importing: false,
  imported: false,
  initialized: false,
  reading: false,
  readProgress: 0,
  readStatus: IMPORT_STATUS.INCOMPLETE,
  parseJSONStatus: IMPORT_STATUS.INCOMPLETE,
  indexCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  indexPatternCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  ingestPipelineCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  permissionCheckStatus: IMPORT_STATUS.INCOMPLETE,
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
  timeFieldName: undefined,
  isFilebeatFlyoutVisible: false,
  checkingValidIndex: false,
  combinedFields: [],
};

export class ImportView extends Component {
  constructor(props) {
    super(props);

    this.state = getDefaultState(DEFAULT_STATE, this.props.results);
  }

  componentDidMount() {
    this.loadIndexPatternNames();
  }

  clickReset = () => {
    const state = getDefaultState(this.state, this.props.results);
    this.setState(state, () => {
      this.loadIndexPatternNames();
    });
  };

  clickImport = () => {
    this.import();
  };

  // TODO - sort this function out. it's a mess
  async import() {
    const { data, results, indexPatterns, kibanaConfig, showBottomBar } = this.props;

    const { format } = results;
    let { timeFieldName } = this.state;
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
      this.setState(
        {
          importing: true,
          errors,
        },
        async () => {
          // check to see if the user has permission to create and ingest data into the specified index
          if ((await hasImportPermission(index)) === false) {
            errors.push(
              i18n.translate('xpack.ml.fileDatavisualizer.importView.importPermissionError', {
                defaultMessage:
                  'You do not have permission to create or import data into index {index}.',
                values: {
                  index,
                },
              })
            );
            this.setState({
              permissionCheckStatus: IMPORT_STATUS.FAILED,
              importing: false,
              imported: false,
              errors,
            });
            return;
          }

          this.setState(
            {
              importing: true,
              imported: false,
              reading: true,
              initialized: true,
              permissionCheckStatus: IMPORT_STATUS.COMPLETE,
            },
            () => {
              this.props.hideBottomBar();
              setTimeout(async () => {
                let success = true;
                const createPipeline = pipelineString !== '';

                let settings = {};
                let mappings = {};
                let pipeline = {};

                try {
                  settings = JSON.parse(indexSettingsString);
                } catch (error) {
                  success = false;
                  const parseError = i18n.translate(
                    'xpack.ml.fileDatavisualizer.importView.parseSettingsError',
                    {
                      defaultMessage: 'Error parsing settings:',
                    }
                  );
                  errors.push(`${parseError} ${error.message}`);
                }

                try {
                  mappings = JSON.parse(mappingsString);
                } catch (error) {
                  success = false;
                  const parseError = i18n.translate(
                    'xpack.ml.fileDatavisualizer.importView.parseMappingsError',
                    {
                      defaultMessage: 'Error parsing mappings:',
                    }
                  );
                  errors.push(`${parseError} ${error.message}`);
                }

                const indexCreationSettings = {
                  settings,
                  mappings,
                };

                try {
                  if (createPipeline) {
                    pipeline = JSON.parse(pipelineString);
                    indexCreationSettings.pipeline = pipeline;
                  }
                } catch (error) {
                  success = false;
                  const parseError = i18n.translate(
                    'xpack.ml.fileDatavisualizer.importView.parsePipelineError',
                    {
                      defaultMessage: 'Error parsing ingest pipeline:',
                    }
                  );
                  errors.push(`${parseError} ${error.message}`);
                }

                this.setState({
                  parseJSONStatus: success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
                });

                // if an @timestamp field has been added to the
                // mappings, use this field as the time field.
                // This relies on the field being populated by
                // the ingest pipeline on ingest
                if (mappings.properties[DEFAULT_TIME_FIELD] !== undefined) {
                  timeFieldName = DEFAULT_TIME_FIELD;
                  this.setState({ timeFieldName });
                }

                if (success) {
                  const importer = importerFactory(format, results, indexCreationSettings);
                  if (importer !== undefined) {
                    const readResp = importer.read(data, this.setReadProgress);
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

                      const indexCreated = initializeImportResp.index !== undefined;
                      this.setState({
                        indexCreatedStatus: indexCreated
                          ? IMPORT_STATUS.COMPLETE
                          : IMPORT_STATUS.FAILED,
                      });

                      if (createPipeline) {
                        const pipelineCreated = initializeImportResp.pipelineId !== undefined;
                        if (indexCreated) {
                          this.setState({
                            ingestPipelineCreatedStatus: pipelineCreated
                              ? IMPORT_STATUS.COMPLETE
                              : IMPORT_STATUS.FAILED,
                            ingestPipelineId: pipelineCreated
                              ? initializeImportResp.pipelineId
                              : '',
                          });
                        }
                        success = indexCreated && pipelineCreated;
                      } else {
                        success = indexCreated;
                      }

                      if (success) {
                        const importId = initializeImportResp.id;
                        const pipelineId = initializeImportResp.pipelineId;
                        const importResp = await importer.import(
                          importId,
                          index,
                          pipelineId,
                          this.setImportProgress
                        );
                        success = importResp.success;
                        this.setState({
                          uploadStatus: importResp.success
                            ? IMPORT_STATUS.COMPLETE
                            : IMPORT_STATUS.FAILED,
                          importFailures: importResp.failures,
                          docCount: importResp.docCount,
                        });

                        if (success) {
                          if (createIndexPattern) {
                            const indexPatternName = indexPattern === '' ? index : indexPattern;
                            const indexPatternResp = await createKibanaIndexPattern(
                              indexPatternName,
                              indexPatterns,
                              timeFieldName,
                              kibanaConfig
                            );
                            success = indexPatternResp.success;
                            this.setState({
                              indexPatternCreatedStatus: indexPatternResp.success
                                ? IMPORT_STATUS.COMPLETE
                                : IMPORT_STATUS.FAILED,
                              indexPatternId: indexPatternResp.id,
                            });
                            if (indexPatternResp.success === false) {
                              errors.push(indexPatternResp.error);
                            }
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

                showBottomBar();

                this.setState({
                  importing: false,
                  imported: success,
                  errors,
                });
              }, 500);
            }
          );
        }
      );
    }
  }

  onConfigModeChange = (configMode) => {
    this.setState({
      configMode,
    });
  };

  onIndexChange = (e) => {
    const index = e.target.value;
    this.setState({
      index,
      checkingValidIndex: true,
    });
    this.debounceIndexCheck(index);
  };

  debounceIndexCheck = debounce(async (index) => {
    if (index === '') {
      this.setState({ checkingValidIndex: false });
      return;
    }

    const { exists } = await ml.checkIndexExists({ index });
    const indexNameError = exists ? (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexNameAlreadyExistsErrorMessage"
        defaultMessage="Index name already exists"
      />
    ) : (
      isIndexNameValid(index)
    );

    this.setState({ checkingValidIndex: false, indexNameError });
  }, 500);

  onIndexPatternChange = (e) => {
    const name = e.target.value;
    const { indexPatternNames, index } = this.state;
    this.setState({
      indexPattern: name,
      indexPatternNameError: isIndexPatternNameValid(name, indexPatternNames, index),
    });
  };

  onCreateIndexPatternChange = (e) => {
    this.setState({
      createIndexPattern: e.target.checked,
    });
  };

  onIndexSettingsStringChange = (text) => {
    this.setState({
      indexSettingsString: text,
    });
  };

  onMappingsStringChange = (text) => {
    this.setState({
      mappingsString: text,
    });
  };

  onPipelineStringChange = (text) => {
    this.setState({
      pipelineString: text,
    });
  };

  onCombinedFieldsChange = (combinedFields) => {
    this.setState({ combinedFields });
  };

  setImportProgress = (progress) => {
    this.setState({
      uploadProgress: progress,
    });
  };

  setReadProgress = (progress) => {
    this.setState({
      readProgress: progress,
    });
  };

  showFilebeatFlyout = () => {
    this.setState({ isFilebeatFlyoutVisible: true });
    this.props.hideBottomBar();
  };

  closeFilebeatFlyout = () => {
    this.setState({ isFilebeatFlyoutVisible: false });
    this.props.showBottomBar();
  };

  async loadIndexPatternNames() {
    await loadIndexPatterns(this.props.indexPatterns);
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
      parseJSONStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      indexPatternCreatedStatus,
      permissionCheckStatus,
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
      timeFieldName,
      isFilebeatFlyoutVisible,
      checkingValidIndex,
      combinedFields,
    } = this.state;

    const createPipeline = pipelineString !== '';

    const statuses = {
      reading,
      readStatus,
      parseJSONStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      indexPatternCreatedStatus,
      permissionCheckStatus,
      uploadProgress,
      uploadStatus,
      createIndexPattern,
      createPipeline,
    };

    const disableImport =
      index === '' ||
      indexNameError !== '' ||
      (createIndexPattern === true && indexPatternNameError !== '') ||
      initialized === true ||
      checkingValidIndex === true;

    return (
      <EuiPage data-test-subj="mlPageFileDataVisImport">
        <EuiPageBody>
          <EuiPageContentHeader>
            <EuiTitle>
              <h1>{this.props.fileName}</h1>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiSpacer size="m" />
          <EuiPanel data-test-subj="mlFileDataVisImportSettingsPanel">
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.importView.importDataTitle"
                  defaultMessage="Import data"
                />
                &nbsp;
                <ExperimentalBadge
                  tooltipContent={
                    <FormattedMessage
                      id="xpack.ml.fileDatavisualizer.importView.experimentalFeatureTooltip"
                      defaultMessage="Experimental feature. We'd love to hear your feedback."
                    />
                  }
                />
              </h2>
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
              combinedFields={combinedFields}
              onCombinedFieldsChange={this.onCombinedFieldsChange}
              results={this.props.results}
            />

            <EuiSpacer size="m" />

            {(initialized === false || importing === true) && (
              <EuiButton
                isDisabled={disableImport}
                onClick={this.clickImport}
                isLoading={importing}
                iconSide="right"
                fill
                data-test-subj="mlFileDataVisImportButton"
              >
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.importView.importButtonLabel"
                  defaultMessage="Import"
                />
              </EuiButton>
            )}

            {initialized === true && importing === false && (
              <EuiButton onClick={this.clickReset}>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.importView.resetButtonLabel"
                  defaultMessage="Reset"
                />
              </EuiButton>
            )}
          </EuiPanel>

          {initialized === true && (
            <React.Fragment>
              <EuiSpacer size="m" />

              <EuiPanel>
                <ImportProgress statuses={statuses} />

                {imported === true && (
                  <React.Fragment>
                    <EuiSpacer size="m" />

                    <ImportSummary
                      index={index}
                      indexPattern={indexPattern === '' ? index : indexPattern}
                      ingestPipelineId={ingestPipelineId}
                      docCount={docCount}
                      importFailures={importFailures}
                      createIndexPattern={createIndexPattern}
                      createPipeline={createPipeline}
                    />

                    <EuiSpacer size="l" />

                    <ResultsLinks
                      index={index}
                      indexPatternId={indexPatternId}
                      timeFieldName={timeFieldName}
                      createIndexPattern={createIndexPattern}
                      showFilebeatFlyout={this.showFilebeatFlyout}
                    />

                    {isFilebeatFlyoutVisible && (
                      <FilebeatConfigFlyout
                        index={index}
                        results={this.props.results}
                        indexPatternId={indexPatternId}
                        ingestPipelineId={ingestPipelineId}
                        closeFlyout={this.closeFilebeatFlyout}
                      />
                    )}
                  </React.Fragment>
                )}
              </EuiPanel>
            </React.Fragment>
          )}
          {errors.length > 0 && (
            <React.Fragment>
              <EuiSpacer size="m" />

              <ImportErrors errors={errors} statuses={statuses} />
            </React.Fragment>
          )}
        </EuiPageBody>
      </EuiPage>
    );
  }
}

async function createKibanaIndexPattern(indexPatternName, indexPatterns, timeFieldName) {
  try {
    const emptyPattern = await indexPatterns.createAndSave({
      title: indexPatternName,
      timeFieldName,
    });

    return {
      success: true,
      id: emptyPattern.id,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

function getDefaultState(state, results) {
  const indexSettingsString =
    state.indexSettingsString === ''
      ? JSON.stringify(DEFAULT_INDEX_SETTINGS, null, 2)
      : state.indexSettingsString;

  const combinedFields = state.combinedFields.length
    ? state.combinedFields
    : getDefaultCombinedFields(results);

  const mappingsString =
    state.mappingsString === ''
      ? JSON.stringify(addCombinedFieldsToMappings(results.mappings, combinedFields), null, 2)
      : state.mappingsString;

  const pipelineString =
    state.pipelineString === '' && results.ingest_pipeline !== undefined
      ? JSON.stringify(
          addCombinedFieldsToPipeline(results.ingest_pipeline, combinedFields),
          null,
          2
        )
      : state.pipelineString;

  const timeFieldName = results.timestamp_field;

  return {
    ...DEFAULT_STATE,
    indexSettingsString,
    mappingsString,
    pipelineString,
    timeFieldName,
    combinedFields,
  };
}

function isIndexNameValid(name) {
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  if (
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexNameContainsIllegalCharactersErrorMessage"
        defaultMessage="Index name contains illegal characters"
      />
    );
  }
  return '';
}

function isIndexPatternNameValid(name, indexPatternNames, index) {
  // if a blank name is entered, the index name will be used so avoid validation
  if (name === '') {
    return '';
  }

  if (indexPatternNames.find((i) => i === name)) {
    return (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexPatternNameAlreadyExistsErrorMessage"
        defaultMessage="Index pattern name already exists"
      />
    );
  }

  // escape . and + to stop the regex matching more than it should.
  let newName = name.replace(/\./g, '\\.');
  newName = newName.replace(/\+/g, '\\+');
  // replace * with .* to make the wildcard match work.
  newName = newName.replace(/\*/g, '.*');
  const reg = new RegExp(`^${newName}$`);
  if (index.match(reg) === null) {
    // name should match index
    return (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexPatternDoesNotMatchIndexNameErrorMessage"
        defaultMessage="Index pattern does not match index name"
      />
    );
  }

  return '';
}
