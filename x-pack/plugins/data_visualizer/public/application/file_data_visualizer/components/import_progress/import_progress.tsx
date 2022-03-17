/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import { EuiStepsHorizontal, EuiProgress, EuiSpacer } from '@elastic/eui';

export enum IMPORT_STATUS {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
  FAILED = 'danger',
}

export interface Statuses {
  reading: boolean;
  readStatus: IMPORT_STATUS;
  parseJSONStatus: IMPORT_STATUS;
  indexCreatedStatus: IMPORT_STATUS;
  ingestPipelineCreatedStatus: IMPORT_STATUS;
  dataViewCreatedStatus: IMPORT_STATUS;
  uploadProgress: number;
  uploadStatus: IMPORT_STATUS;
  createDataView: boolean;
  createPipeline: boolean;
  permissionCheckStatus: IMPORT_STATUS;
}

export const ImportProgress: FC<{ statuses: Statuses }> = ({ statuses }) => {
  const {
    reading,
    readStatus,
    parseJSONStatus,
    indexCreatedStatus,
    ingestPipelineCreatedStatus,
    dataViewCreatedStatus,
    uploadProgress,
    uploadStatus,
    createDataView,
    createPipeline,
  } = statuses;

  let statusInfo = null;

  let completedStep = 0;

  if (
    reading === true &&
    readStatus === IMPORT_STATUS.INCOMPLETE &&
    parseJSONStatus === IMPORT_STATUS.INCOMPLETE
  ) {
    completedStep = 0;
  }
  if (
    readStatus === IMPORT_STATUS.COMPLETE &&
    indexCreatedStatus === IMPORT_STATUS.INCOMPLETE &&
    ingestPipelineCreatedStatus === IMPORT_STATUS.INCOMPLETE
  ) {
    completedStep = 1;
  }
  if (indexCreatedStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 2;
  }
  if (
    ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE ||
    (createPipeline === false && indexCreatedStatus === IMPORT_STATUS.COMPLETE)
  ) {
    completedStep = 3;
  }
  if (uploadStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 4;
  }
  if (dataViewCreatedStatus === IMPORT_STATUS.COMPLETE) {
    completedStep = 5;
  }

  let processFileTitle = i18n.translate(
    'xpack.dataVisualizer.file.importProgress.processFileTitle',
    {
      defaultMessage: 'Process file',
    }
  );
  let createIndexTitle = i18n.translate(
    'xpack.dataVisualizer.file.importProgress.createIndexTitle',
    {
      defaultMessage: 'Create index',
    }
  );
  let createIngestPipelineTitle = i18n.translate(
    'xpack.dataVisualizer.file.importProgress.createIngestPipelineTitle',
    {
      defaultMessage: 'Create ingest pipeline',
    }
  );
  let uploadingDataTitle = i18n.translate(
    'xpack.dataVisualizer.file.importProgress.uploadDataTitle',
    {
      defaultMessage: 'Upload data',
    }
  );
  let createDataViewTitle = i18n.translate(
    'xpack.dataVisualizer.file.importProgress.createDataViewTitle',
    {
      defaultMessage: 'Create data view',
    }
  );

  const creatingIndexStatus = (
    <p>
      <FormattedMessage
        id="xpack.dataVisualizer.file.importProgress.stepTwoCreatingIndexDescription"
        defaultMessage="Creating index"
      />
    </p>
  );

  const creatingIndexAndIngestPipelineStatus = (
    <p>
      <FormattedMessage
        id="xpack.dataVisualizer.file.importProgress.stepTwoCreatingIndexIngestPipelineDescription"
        defaultMessage="Creating index and ingest pipeline"
      />
    </p>
  );

  if (completedStep >= 0) {
    processFileTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.processingFileTitle',
      {
        defaultMessage: 'Processing file',
      }
    );
    statusInfo = (
      <p>
        <FormattedMessage
          id="xpack.dataVisualizer.file.importProgress.processingImportedFileDescription"
          defaultMessage="Processing file for import"
        />
      </p>
    );
  }
  if (completedStep >= 1) {
    processFileTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.fileProcessedTitle',
      {
        defaultMessage: 'File processed',
      }
    );
    createIndexTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.creatingIndexTitle',
      {
        defaultMessage: 'Creating index',
      }
    );
    statusInfo =
      createPipeline === true ? creatingIndexAndIngestPipelineStatus : creatingIndexStatus;
  }
  if (completedStep >= 2) {
    createIndexTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.indexCreatedTitle',
      {
        defaultMessage: 'Index created',
      }
    );
    createIngestPipelineTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.creatingIngestPipelineTitle',
      {
        defaultMessage: 'Creating ingest pipeline',
      }
    );
    statusInfo =
      createPipeline === true ? creatingIndexAndIngestPipelineStatus : creatingIndexStatus;
  }
  if (completedStep >= 3) {
    createIngestPipelineTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.ingestPipelineCreatedTitle',
      {
        defaultMessage: 'Ingest pipeline created',
      }
    );
    uploadingDataTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.uploadingDataTitle',
      {
        defaultMessage: 'Uploading data',
      }
    );
    statusInfo = <UploadFunctionProgress progress={uploadProgress} />;
  }
  if (completedStep >= 4) {
    uploadingDataTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.dataUploadedTitle',
      {
        defaultMessage: 'Data uploaded',
      }
    );
    if (createDataView === true) {
      createDataViewTitle = i18n.translate(
        'xpack.dataVisualizer.file.importProgress.creatingDataViewTitle',
        {
          defaultMessage: 'Creating data view',
        }
      );
      statusInfo = (
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.file.importProgress.creatingDataViewDescription"
            defaultMessage="Creating data view"
          />
        </p>
      );
    } else {
      statusInfo = null;
    }
  }
  if (completedStep >= 5) {
    createDataViewTitle = i18n.translate(
      'xpack.dataVisualizer.file.importProgress.dataViewCreatedTitle',
      {
        defaultMessage: 'Data view created',
      }
    );
    statusInfo = null;
  }

  const steps = [
    {
      title: processFileTitle,
      isSelected: true,
      isComplete:
        readStatus === IMPORT_STATUS.COMPLETE && parseJSONStatus === IMPORT_STATUS.COMPLETE,
      status: parseJSONStatus === IMPORT_STATUS.FAILED ? parseJSONStatus : readStatus, // if JSON parsing failed, fail the first step
      onClick: () => {},
    },
    {
      title: createIndexTitle,
      isSelected: readStatus === IMPORT_STATUS.COMPLETE,
      isComplete: indexCreatedStatus === IMPORT_STATUS.COMPLETE,
      status: indexCreatedStatus,
      onClick: () => {},
    },
    {
      title: uploadingDataTitle,
      isSelected:
        indexCreatedStatus === IMPORT_STATUS.COMPLETE &&
        (createPipeline === false ||
          (createPipeline === true && ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE)),
      isComplete: uploadStatus === IMPORT_STATUS.COMPLETE,
      status: uploadStatus,
      onClick: () => {},
    },
  ];

  if (createPipeline === true) {
    steps.splice(2, 0, {
      title: createIngestPipelineTitle,
      isSelected: indexCreatedStatus === IMPORT_STATUS.COMPLETE,
      isComplete: ingestPipelineCreatedStatus === IMPORT_STATUS.COMPLETE,
      status: ingestPipelineCreatedStatus,
      onClick: () => {},
    });
  }

  if (createDataView === true) {
    steps.push({
      title: createDataViewTitle,
      isSelected: uploadStatus === IMPORT_STATUS.COMPLETE,
      isComplete: dataViewCreatedStatus === IMPORT_STATUS.COMPLETE,
      status: dataViewCreatedStatus,
      onClick: () => {},
    });
  }

  return (
    <React.Fragment>
      <EuiStepsHorizontal steps={steps} style={{ backgroundColor: 'transparent' }} />
      {statusInfo && (
        <React.Fragment>
          <EuiSpacer size="m" />
          {statusInfo}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

const UploadFunctionProgress: FC<{ progress: number }> = ({ progress }) => {
  return (
    <React.Fragment>
      <p>
        <FormattedMessage
          id="xpack.dataVisualizer.file.importProgress.uploadingDataDescription"
          defaultMessage="Uploading data"
        />
      </p>
      {progress < 100 && (
        <React.Fragment>
          <EuiSpacer size="s" />
          <EuiProgress value={progress} max={100} color="primary" size="s" />
        </React.Fragment>
      )}
    </React.Fragment>
  );
};
