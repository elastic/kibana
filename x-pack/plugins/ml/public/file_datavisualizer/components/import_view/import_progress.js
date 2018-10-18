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

  let processFileTitle = 'Process file';
  if (reading === true && readStatus === IMPORT_STATUS.INCOMPLETE) {
    processFileTitle = 'Processing file';
    statusInfo = (<p>Converting file for import</p>);
  } else if (reading === false && readStatus === IMPORT_STATUS.COMPLETE) {
    processFileTitle = 'File processed';
  }

  let createIndexTitle = 'Create index';
  if (indexCreatedStatus === IMPORT_STATUS.COMPLETE) {
    createIndexTitle = 'Index created';
  }

  let createIngestPipelineTitle = 'Create ingest pipeline';
  if (ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE) {
    createIngestPipelineTitle = 'Ingest pipeline created';
  }

  let uploadingDataTitle = 'Upload data';
  if (uploadProgress > 0 && uploadStatus === IMPORT_STATUS.INCOMPLETE) {
    uploadingDataTitle = 'Uploading data';

    statusInfo = (<UploadFunctionProgress progress={uploadProgress} />);
  } else if (uploadStatus === IMPORT_STATUS.COMPLETE) {
    uploadingDataTitle = 'Data uploaded';
  }

  let createIndexPatternTitle = 'Create index pattern';
  if (indexPatternCreatedStatus === IMPORT_STATUS.FAILED) {
    createIndexPatternTitle = 'Index pattern created';
    statusInfo = null;
  }

  const firstSetOfSteps = [
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
      isSelected: ((indexCreatedStatus && ingestPipelineCreatedStatus) === IMPORT_STATUS.COMPLETE),
      isComplete: (uploadStatus === IMPORT_STATUS.COMPLETE),
      status: uploadStatus,
      onClick: () => {},
    }
  ];

  if (createIndexPattern === true) {
    firstSetOfSteps.push({
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
        steps={firstSetOfSteps}
      />
      { statusInfo }
    </React.Fragment>
  );
}

function UploadFunctionProgress({ progress }) {
  return (
    <React.Fragment>
      <p>Uploading data</p>
      {(progress > 0 && progress < 100) &&
        <React.Fragment>
          <EuiSpacer size="s" />
          <EuiProgress value={progress} max={100} color="primary" size="s" />
        </React.Fragment>
      }
    </React.Fragment>
  );
}
