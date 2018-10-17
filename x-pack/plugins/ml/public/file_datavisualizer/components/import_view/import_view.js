/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiFieldText,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiPanel,
} from '@elastic/eui';

import { importerFactory } from './importer';
import { ResultsLinks } from './results_links';
import { ImportProgress, IMPORT_STATUS } from './import_progress';

const DEFAULT_TIME_FIELD = '@timestamp';

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
};

export class ImportView extends Component {
  constructor(props) {
    super(props);

    this.state = DEFAULT_STATE;
  }

  clickReset = () => {
    this.setState(DEFAULT_STATE);
  }

  clickImport() {
    this.import();
  }

  async import() {
    const { format } = this.props.results;
    const { fileContents, results } = this.props;
    const {
      index,
      indexPattern,
      createIndexPattern,
    } = this.state;

    if (index !== '') {
      this.setState({
        importing: true,
        imported: false,
        reading: true,
        initialized: true,
      }, () => {
        setTimeout(async () => {
          let success = false;

          const importer = importerFactory(format, results);
          if (importer !== undefined) {

            console.log('read start');
            const readResp = await importer.read(fileContents, this.setReadProgress);
            console.log('read end');
            success = readResp.success;
            this.setState({
              readStatus: success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
              reading: false,
            });

            if (readResp.success === false) {
              console.error(readResp.error);
            }

            if (success) {
              const importResp = await importer.import(index, this.setImportProgress);
              success = importResp.success;
              this.setState({
                uploadStatus: importResp.success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
              });


              if (success && createIndexPattern) {
                const indexPatternName = (indexPattern === '') ? index : indexPattern;
                const indexPatternId = await this.createIndexPattern(indexPatternName);
                console.log(indexPatternId);
                this.setState({
                  indexPatternCreatedStatus: IMPORT_STATUS.COMPLETE,
                  indexPatternId,
                });
              }
            }

            this.setState({
              importing: false,
              imported: success,
            });
          } else {
            console.error('Unsupported file format');
          }
        }, 500);
      });
    }
  }

  onIndexChange = (e) => {
    this.setState({
      index: e.target.value,
    });
  }

  onIndexPatternChange = (e) => {
    this.setState({
      indexPattern: e.target.value,
    });
  }

  onCreateIndexPatternChange = (e) => {
    this.setState({
      createIndexPattern: e.target.checked,
    });
  }

  setImportProgress = (progress) => {
    this.setState({
      indexCreatedStatus: (progress > 0) ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.INCOMPLETE,
      ingestPipelineCreatedStatus: (progress > 0) ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.INCOMPLETE,
      uploadProgress: progress,
    });
  }

  setReadProgress = (progress) => {
    this.setState({
      readProgress: progress,
    });
  }

  async createIndexPattern(indexPatternName, timeFieldName = DEFAULT_TIME_FIELD) {
    let createdId;
    try {
      const emptyPattern = await this.props.indexPatterns.get();

      Object.assign(emptyPattern, {
        id: '',
        title: indexPatternName,
        timeFieldName,
      });

      createdId = await emptyPattern.create();
      return createdId;
    } catch (error) {
      console.error(error);
    }
    return createdId;
  }


  render() {
    const {
      index,
      indexPattern,
      indexPatternId,
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

    return (
      <React.Fragment>

        <EuiPanel>

          <EuiFormRow
            label="Index name"
          >
            <EuiFieldText
              placeholder="index name"
              value={index}
              disabled={initialized === true}
              onChange={this.onIndexChange}
            />
          </EuiFormRow>

          <EuiCheckbox
            id="createIndexPattern"
            label="Create index pattern"
            checked={createIndexPattern === true}
            disabled={initialized === true}
            onChange={this.onCreateIndexPatternChange}
          />

          <EuiSpacer size="s" />

          <EuiFormRow
            label="Index pattern name"
            disabled={(createIndexPattern === false || initialized === true)}
          >
            <EuiFieldText
              disabled={(createIndexPattern === false || initialized === true)}
              placeholder={(createIndexPattern === true) ? index : ''}
              value={indexPattern}
              onChange={this.onIndexPatternChange}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {
            (initialized === false || importing === true) &&

            <EuiButton
              isDisabled={index === '' || initialized === true}
              onClick={() => this.clickImport()}
              isLoading={importing}
              iconSide="right"
            >
              Import
            </EuiButton>
          }

          {
            (initialized === true && importing === false) &&

            <EuiButton
              onClick={() => this.clickReset()}
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

            </EuiPanel>

            {
              (readStatus === IMPORT_STATUS.FAILED || uploadStatus === IMPORT_STATUS.FAILED) &&
              <React.Fragment>
                <EuiSpacer size="m" />

                <EuiCallOut
                  title="Sorry, there was an error"
                  color="danger"
                  iconType="cross"
                >
                  <p>
                    Now you have to fix it, but maybe
                  </p>
                </EuiCallOut>
              </React.Fragment>
            }
          </React.Fragment>
        }


        {(imported === true) &&
          <React.Fragment>
            <EuiSpacer size="m" />

            <EuiPanel>

              <ResultsLinks
                index={(index)}
                indexPatternId={(indexPatternId)}
                timeFieldName={DEFAULT_TIME_FIELD}
              />

            </EuiPanel>
          </React.Fragment>
        }

      </React.Fragment>
    );
  }
}


