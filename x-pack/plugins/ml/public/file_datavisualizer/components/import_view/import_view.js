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
  EuiLoadingSpinner,
  EuiSteps,
  EuiProgress,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiPanel,
} from '@elastic/eui';

import { importerFactory } from './importer';
import { ResultsLinks } from './results_links';

export class ImportView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      index: '',
      importing: false,
      imported: false,
      reading: false,
      readProgress: 0,
      readStatus: 'incomplete',
      indexCreatedStatus: 'incomplete',
      indexPatternCreatedStatus: 'incomplete',
      uploadProgress: 0,
      uploadStatus: 'incomplete',
      createIndexPattern: true,
      indexPattern: '',
      indexPatternId: '',
    };
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

    if (/*format === 'delimited' && */index !== '') {
      this.setState({
        importing: true,
        imported: false,
        reading: true,
      }, () => {
        setTimeout(async () => {
          // console.time('importer');

          const importer = importerFactory(format, results);
          if (importer !== undefined) {

            console.log('read start');
            let success = await importer.read(fileContents, this.setReadProgress);
            console.log('read end');
            this.setState({ readStatus: 'complete', reading: false, });

            if (success) {
              success = await importer.import(index, this.setImportProgress);
              this.setState({ uploadStatus: 'complete' });


              if (success && createIndexPattern) {
                const indexPatternName = (indexPattern === '') ? index : indexPattern;
                const indexPatternId = await this.createIndexPattern(indexPatternName);
                console.log(indexPatternId);
                this.setState({
                  indexPatternCreatedStatus: 'complete',
                  indexPatternId,
                });
              }
            }
            // console.timeEnd('importer');

            this.setState({
              importing: false,
              imported: success,
            });
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
      indexCreatedStatus: (progress > 0) ? 'complete' : 'incomplete',
      uploadProgress: progress,
    });
  }

  setReadProgress = (progress) => {
    this.setState({
      readProgress: progress,
    });
  }

  async createIndexPattern(indexPatternName, timeFieldName = '@timestamp') {
    let createdId;
    try {
      const emptyPattern = await this.props.indexPatterns.get();

      Object.assign(emptyPattern, {
        id: '',
        title: indexPatternName,
        timeFieldName,
      });

      createdId = await emptyPattern.create();
      console.log(createdId);
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
      readStatus,
      indexCreatedStatus,
      indexPatternCreatedStatus,
      uploadProgress,
      uploadStatus,
      createIndexPattern,
    } = this.state;

    let processFileTitle = 'Process file';
    if (reading === true && readStatus === 'incomplete') {
      processFileTitle = 'Processing file';
    } else if (reading === false && readStatus === 'complete') {
      processFileTitle = 'File processed';
    }

    let createIndexTitle = 'Create index';
    if (indexCreatedStatus === 'complete') {
      createIndexTitle = 'Index created';
    }

    let uploadingDataTitle = 'Upload data';
    if (uploadProgress > 0 && uploadStatus === 'incomplete') {
      uploadingDataTitle = 'Uploading data';
    } else if (uploadStatus === 'complete') {
      uploadingDataTitle = 'Data uploaded';
    }

    let createIndexPatternTitle = 'Create index pattern';
    if (indexCreatedStatus === 'complete') {
      createIndexPatternTitle = 'Index pattern created';
    }

    const firstSetOfSteps = [
      {
        title: processFileTitle,
        children: (<p>Converting file for import</p>),
        status: readStatus,
      },
      {
        title: createIndexTitle,
        children: (<p>Creating index</p>),
        status: indexCreatedStatus,
      },
      {
        title: uploadingDataTitle,
        children: (
          <React.Fragment>
            <p>Uploading data</p>
            {(uploadProgress > 0 && uploadProgress < 100) &&
              <React.Fragment>
                <EuiSpacer size="s" />
                <EuiProgress value={uploadProgress} max={100} color="primary" size="s" />
              </React.Fragment>
            }
          </React.Fragment>
        ),
        status: uploadStatus,
      }
    ];

    if (createIndexPattern === true) {
      firstSetOfSteps.push({
        title: createIndexPatternTitle,
        children: (<p>Creating index pattern</p>),
        status: indexPatternCreatedStatus,
      });
    }

    return (
      <React.Fragment>

        <EuiPanel>

          <EuiFormRow
            label="Index name"
          >
            <EuiFieldText
              placeholder="index name"
              value={index}
              disabled={importing === true}
              onChange={this.onIndexChange}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>

          <EuiCheckbox
            id="createIndexPattern"
            label="Create index pattern"
            checked={createIndexPattern === true}
            disabled={importing === true}
            onChange={this.onCreateIndexPatternChange}
          />

          <EuiSpacer size="s" />

          <EuiFormRow
            label="Index pattern name"
            disabled={(createIndexPattern === false || importing === true)}
          >
            <EuiFieldText
              disabled={(createIndexPattern === false || importing === true)}
              placeholder={(createIndexPattern === true) ? index : ''}
              value={indexPattern}
              onChange={this.onIndexPatternChange}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiButton
            isDisabled={importing}
            onClick={() => this.clickImport()}
          >
            Import
          </EuiButton>


          {(importing === true) &&
            <React.Fragment>
              <EuiLoadingSpinner size="m"/>
            </React.Fragment>
          }
        </EuiPanel>


        {(importing === true || imported === true) &&
          <React.Fragment>
            <EuiSpacer size="m" />

            <EuiPanel>
              <EuiSteps
                steps={firstSetOfSteps}
              />
            </EuiPanel>
          </React.Fragment>
        }


        {(imported === true) &&
          <React.Fragment>
            <EuiSpacer size="m" />

            <EuiPanel>
              <ResultsLinks indexPatternId={(indexPatternId)} />
            </EuiPanel>
          </React.Fragment>
        }

      </React.Fragment>
    );
  }
}


