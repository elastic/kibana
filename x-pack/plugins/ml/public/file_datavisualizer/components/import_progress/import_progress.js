/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiStepsHorizontal,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';

export const IMPORT_STATUS = {
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  FAILED: 'danger',
};

export function ImportProgress({ statuses }) {

  const {
    reading,
    readStatus,
    indexCreatedStatus,
    ingestPipelineCreatedStatus,
    indexPatternCreatedStatus,
    uploadProgress,
    uploadStatus,
    createIndexPattern,
  } = statuses;

  let statusInfo = null;

  let completedStep = 0;

  if (reading === true && readStatus === IMPORT_STATUS.INCOMPLETE) {
    completedStep = 0;
  }
  if (
    readStatus === IMPORT_STATUS.COMPLETE &&
    indexCreatedStatus  === IMPORT_STATUS.INCOMPLETE &&
    ingestPipelineCreatedStatus  === IMPORT_STATUS.INCOMPLETE
  ) {
    completedStep = 1;
  }
  if (indexCreatedStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 2;
  }
  if (ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 3;
  }
  if (uploadStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 4;
  }
  if (indexPatternCreatedStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 5;
  }


  let processFileTitle = 'Process file';
  let createIndexTitle = 'Create index';
  let createIngestPipelineTitle = 'Create ingest pipeline';
  let uploadingDataTitle = 'Upload data';
  let createIndexPatternTitle = 'Create index pattern';

  if (completedStep >= 0) {
    processFileTitle = 'Processing file';
    statusInfo = (<p>Processing file for import</p>);
  }
  if (completedStep >= 1) {
    processFileTitle = 'File processed';
    createIndexTitle = 'Creating index';
    statusInfo = (<p>Creating index and ingest pipeline</p>);
  }
  if (completedStep >= 2) {
    createIndexTitle = 'Index created';
    createIngestPipelineTitle = 'Creating ingest pipeline';
    statusInfo = (<p>Creating index and ingest pipeline</p>);
  }
  if (completedStep >= 3) {
    createIngestPipelineTitle = 'Ingest pipeline created';
    uploadingDataTitle = 'Uploading data';
    statusInfo = (<UploadFunctionProgress progress={uploadProgress} />);
  }
  if (completedStep >= 4) {
    uploadingDataTitle = 'Data uploaded';
    if (createIndexPattern === true) {
      createIndexPatternTitle = 'Creating index pattern';
      statusInfo = (<p>Creating index pattern</p>);
    }
  }
  if (completedStep >= 5) {
    createIndexPatternTitle = 'Index pattern created';
    statusInfo = null;
  }

  const steps = [
    {
      title: processFileTitle,
      isSelected: true,
      isComplete: (readStatus === IMPORT_STATUS.COMPLETE),
      status: readStatus,
      onClick: () => {},
    },
    {
      title: createIndexTitle,
      isSelected: (readStatus === IMPORT_STATUS.COMPLETE),
      isComplete: (indexCreatedStatus === IMPORT_STATUS.COMPLETE),
      status: indexCreatedStatus,
      onClick: () => {},
    },
    {
      title: createIngestPipelineTitle,
      isSelected: (indexCreatedStatus === IMPORT_STATUS.COMPLETE),
      isComplete: (ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE),
      status: ingestPipelineCreatedStatus,
      onClick: () => {},
    },
    {
      title: uploadingDataTitle,
      isSelected: (indexCreatedStatus === IMPORT_STATUS.COMPLETE && ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE),
      isComplete: (uploadStatus === IMPORT_STATUS.COMPLETE),
      status: uploadStatus,
      onClick: () => {},
    }
  ];

  if (createIndexPattern === true) {
    steps.push({
      title: createIndexPatternTitle,
      isSelected: (uploadStatus === IMPORT_STATUS.COMPLETE),
      isComplete: (indexPatternCreatedStatus === IMPORT_STATUS.COMPLETE),
      status: indexPatternCreatedStatus,
      onClick: () => {},
    });
  }

  return (
    <React.Fragment>
      <EuiStepsHorizontal
        steps={steps}
        style={{ backgroundColor: 'transparent' }}
      />
      { statusInfo &&
        <React.Fragment>
          <EuiSpacer size="m" />
          { statusInfo }
        </React.Fragment>
      }
    </React.Fragment>
  );
}

function UploadFunctionProgress({ progress }) {
  return (
    <React.Fragment>
      <p>Uploading data</p>
      {(progress < 100) &&
        <React.Fragment>
          <EuiSpacer size="s" />
          <EuiProgress value={progress} max={100} color="primary" size="s" />
        </React.Fragment>
      }
    </React.Fragment>
  );
}
