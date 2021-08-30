/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer } from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { UploadPanel } from './upload_panel';
import { PreviewPanel } from './pipeline_preview_panel';
import { CreatePipelinePanel } from './create_pipeline_panel';
import { ResultsPanel } from './results_panel';
import { ErrorPanel } from './error_panel';
import { readFile } from '../util/utils';
import { FieldCopyAction } from '../../../../common';
import { MapperProxy } from '../../mapper_api';
import { FileUploadPluginStart } from '../../../../../file_upload/public';
import fileSaver from 'file-saver';

export interface Props {
  fileUpload: FileUploadPluginStart;
  mapper: MapperProxy;
  navigateToApp(app: string, options: NavigateToAppOptions): void; // todo object type
}

export const EcsMapperUploadView: FC<Props> = ({ fileUpload, mapper, navigateToApp }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState<boolean>(false);
  const [isPipelineCreated, setIsPipelineCreated] = useState<boolean>(false);
  const [pipelineProcessors, setPipelineProcessors] = useState<object[]>([]);
  const [pipelineName, setPipelineName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const onManageIngestPipeline = () => {
    navigateToApp('management', {
      path: `/ingest/ingest_pipelines/edit/${pipelineName}`,
    });
  };

  const onFileUpload = async (action: FieldCopyAction, files: FileList) => {
    setError('');
    //setPipelineName(name);

    if (files.length > 0) {
      setIsLoading(true);
      processFile(files[0], action);
    }
  };

  const fetchPipelineFromMapping = async (fileContents: string, action: FieldCopyAction) => {
    try {
      const processors = await mapper.fetchPipelineFromMapping(fileContents, action);
      setPipelineProcessors(processors);
      setIsLoading(false);
      setIsUploaded(true);
    } catch (e) {
      if (e.body?.statusCode === 400) {
        setError(e.body.message);
      } else {
        setError(
          i18n.translate('xpack.ecsMapper.fetchPipeline.unexpectedError', {
            defaultMessage: 'Unexpected error {e}',
            values: { e },
          })
        );
      }

      setIsLoading(false);
      setIsUploaded(false);
    }
  };

  const onCreatePipeline = async (name: string) => {
    setPipelineName(name);
    try {
      await mapper.createIngestNodePipeline(name, pipelineProcessors);
      setIsPipelineCreated(true);
    } catch (e) {
      if (e.body?.statusCode === 409) {
        setError('There is already an existing Ingest Node Pipeline named ' + name);
      } else {
        setError(
          i18n.translate('xpack.ecsMapper.createIngestNodePipeline.unexpectedError', {
            defaultMessage: 'Unexpected error {e}',
            values: { e },
          })
        );
      }
    }
  };

  const onClickToCreatePipeline = () => {
    setIsCreatingPipeline(true);
  }

  const onDownload = () => {
    const jsonBlob = new Blob([JSON.stringify(pipelineProcessors)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `my-mappings.json`);
  };

  const onCancelCreate = () => {
    setError('');
    setIsUploaded(false);
    setPipelineName('');
    setPipelineProcessors([]);
    setIsPipelineCreated(false);
    setIsCreatingPipeline(false);
  };

  const processFile = async (file: File, action: FieldCopyAction) => {
    const maxBytes = fileUpload.getMaxBytes();

    if (file.size <= maxBytes) {
      try {
        const fileContents = await readFile(file, maxBytes);

        fetchPipelineFromMapping(fileContents, action);
      } catch (e) {
        setIsLoading(false);
        setIsUploaded(false);
        setError(
          i18n.translate('xpack.ecsMapper.createIngestNodePipeline.unexpectedError', {
            defaultMessage: 'Unexpected error {e}',
            values: { e },
          })
        );
      }
    } else {
      setError('File is greater than allowed size of ' + maxBytes + 'bytes.');
    }
  };

  return (
    <EuiPage className="prfDevTool__page" data-test-subj="ecsMapperFileUpload">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          {!isUploaded && (!isPipelineCreated || !!error) && (
            <UploadPanel
              onFileUpload={onFileUpload}
              actionOptions={Object.values(FieldCopyAction)}
              isLoading={isLoading}
              isUploaded={isUploaded}
            />
          )}

          <EuiSpacer size="m" />

          {isUploaded && (
            <PreviewPanel
              processors={pipelineProcessors}
              onDownload={onDownload}
              onClickToCreatePipeline={onClickToCreatePipeline}
              isCreatingPipeline={isCreatingPipeline}
            />
          )}

          {isCreatingPipeline && (
            <CreatePipelinePanel
              onCreatePipeline={onCreatePipeline}
              onCancel={onCancelCreate}
            />
          )}

          <EuiSpacer size="m" />

          {isPipelineCreated && <ResultsPanel onManageIngestPipeline={onManageIngestPipeline} />}

          <EuiSpacer size="m" />

          {error && <ErrorPanel error={error} />}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
