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
  if (reading === true && readStatus === 'incomplete') {
    processFileTitle = 'Processing file';
    statusInfo = (<p>Converting file for import</p>);
  } else if (reading === false && readStatus === 'complete') {
    processFileTitle = 'File processed';
  }

  let createIndexTitle = 'Create index';
  if (indexCreatedStatus === 'complete') {
    createIndexTitle = 'Index created';
  }

  let createIngestPipelineTitle = 'Create ingest pipeline';
  if (ingestPipelineCreatedStatus === 'complete') {
    createIngestPipelineTitle = 'Ingest pipeline created';
  }

  let uploadingDataTitle = 'Upload data';
  if (uploadProgress > 0 && uploadStatus === 'incomplete') {
    uploadingDataTitle = 'Uploading data';

    statusInfo = (<UploadFunctionProgress progress={uploadProgress} />);
  } else if (uploadStatus === 'complete') {
    uploadingDataTitle = 'Data uploaded';
  }

  let createIndexPatternTitle = 'Create index pattern';
  if (indexPatternCreatedStatus === 'danger') {
    createIndexPatternTitle = 'Index pattern created';
    statusInfo = null;
  }

  const firstSetOfSteps = [
    {
      title: processFileTitle,
      isSelected: true,
      isComplete: (readStatus === 'complete'),
      status: readStatus,
      onClick: () => {},
    },
    {
      title: createIndexTitle,
      isSelected: (readStatus === 'complete'),
      isComplete: (indexCreatedStatus === 'complete'),
      status: indexCreatedStatus,
      onClick: () => {},
    },
    {
      title: createIngestPipelineTitle,
      isSelected: (indexCreatedStatus === 'complete'),
      isComplete: (ingestPipelineCreatedStatus === 'complete'),
      status: ingestPipelineCreatedStatus,
      onClick: () => {},
    },
    {
      title: uploadingDataTitle,
      isSelected: (indexCreatedStatus === 'complete'),
      isComplete: (uploadStatus === 'complete'),
      status: uploadStatus,
      onClick: () => {},
    }
  ];

  if (createIndexPattern === true) {
    firstSetOfSteps.push({
      title: createIndexPatternTitle,
      isSelected: (uploadStatus === 'complete'),
      isComplete: (indexPatternCreatedStatus === 'complete'),
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
