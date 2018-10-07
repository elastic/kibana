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
} from '@elastic/eui';

import { CsvImporter } from './csv_importer';

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
    };
  }

  clickImport() {
    this.import();
  }

  async import() {
    const { format, timestamp_field: timeStampField } = this.props.results;
    const { fileContents, results } = this.props;
    const { index } = this.state;

    if (format === 'delimited' && index !== '') {
      this.setState({
        importing: true,
        imported: false,
        reading: true,
      }, () => {
        setTimeout(async () => {
          // console.time('importer');
          const importer = new CsvImporter(results);

          console.log('read start');
          let imported = await importer.read(fileContents, this.setReadProgress);
          console.log('read end');
          this.setState({ readStatus: 'complete', reading: false, });

          if (imported) {
            imported = await importer.import(index, this.setImportProgress);
            this.setState({ uploadStatus: 'complete' });
          }

          await this.createIndexPattern(index, timeStampField);
          this.setState({ indexPatternCreatedStatus: 'complete' });
          // console.timeEnd('importer');

          this.setState({
            importing: false,
            imported,
          });
        }, 500);
      });
    }
  }

  onIndexChange = (e) => {
    this.setState({
      index: e.target.value,
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

  async createIndexPattern(indexPatternName, timeFieldName) {
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
      importing,
      reading,
      readStatus,
      indexCreatedStatus,
      indexPatternCreatedStatus,
      uploadProgress,
      uploadStatus,
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
      },
      {
        title: createIndexPatternTitle,
        children: (<p>Creating index pattern</p>),
        status: indexPatternCreatedStatus,
      },
    ];

    return (
      <React.Fragment>

        <EuiFieldText
          placeholder="index name"
          value={index}
          onChange={this.onIndexChange}
          aria-label="Use aria labels when no actual label is in use"
        />

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

        <EuiSpacer size="m" />

        <div>
          <EuiSteps
            steps={firstSetOfSteps}
          />

        </div>
      </React.Fragment>
    );
  }
}
