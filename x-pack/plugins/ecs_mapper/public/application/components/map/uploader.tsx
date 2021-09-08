/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiPage, EuiPageBody, EuiPageContent, EuiSpacer } from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import fileSaver from 'file-saver';
import { UploadPanel } from './upload_panel';
import { PreviewPanel } from './pipeline_preview_panel';
import { CreatePipelinePanel } from './create_pipeline_panel';
import { ResultsPanel } from './results_panel';
import { ErrorPanel } from './error_panel';
import { readFile } from '../util/utils';
import { FieldCopyAction } from '../../../../common';
import { MapperProxy } from '../../mapper_api';
import { FileUploadPluginStart } from '../../../../../file_upload/public';
import { Instructions } from './instructions';

export interface Props {
  fileUpload: FileUploadPluginStart;
  mapper: MapperProxy;
  navigateToApp(app: string, options: NavigateToAppOptions): void;
}

export const EcsMapperUploadView: FC<Props> = ({ fileUpload, mapper, navigateToApp }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState<boolean>(false);
  const [isPipelineCreated, setIsPipelineCreated] = useState<boolean>(false);
  const [pipelineProcessors, setPipelineProcessors] = useState<object[]>([]);
  const [pipelineName, setPipelineName] = useState<string>('');
  const [errorTitle, setErrorTitle] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [file, setFile] = useState<FileList | null>(null);

  const hasError = !!errorTitle || !!errorDetails;

  const onUpdateProcessors = (updatedProcessors: object[]) => {
    setPipelineProcessors(updatedProcessors);
  };

  const onManageIngestPipeline = () => {
    navigateToApp('management', {
      path: `/ingest/ingest_pipelines/edit/${pipelineName}`,
    });
  };

  const onFilePickerChange = (files: FileList) => {
    setErrorTitle('');
    setErrorDetails('');

    setFile(files);
  };

  const onFileUpload = async (action: FieldCopyAction) => {
    if (file != null && file.length > 0) {
      setIsLoading(true);
      processFile(file[0], action);
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
        const errorParts = e.body.message.split(":");
        setErrorTitle(errorParts[0]);
        setErrorDetails(errorParts[1]);
      } else {
        setErrorTitle(
          i18n.translate('xpack.ecsMapper.fetchPipeline.unexpectedErrorTitle', {
            defaultMessage: 'Something went wrong'
          })
        );
        setErrorDetails(
          i18n.translate('xpack.ecsMapper.fetchPipeline.unexpectedErrorDetails', {
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
    setIsPipelineCreated(true);
    try {
      await mapper.createIngestNodePipeline(name, pipelineProcessors);
    } catch (e) {
      if (e.body?.statusCode === 409) {
        setErrorTitle('Pipeline already exists');
        setErrorDetails('There is already an existing Ingest Node Pipeline named ' + name);
      } else {
        setErrorTitle(
          i18n.translate('xpack.ecsMapper.fetchPipeline.unexpectedErrorTitle', {
            defaultMessage: 'Something went wrong'
          })
        );
        setErrorDetails(
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
  };

  const onDownload = () => {
    const jsonBlob = new Blob([JSON.stringify(pipelineProcessors)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `my-mappings.json`);
  };

  const onCancelCreate = () => {
    setErrorTitle('');
    setErrorDetails('');
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
        setErrorTitle(
          i18n.translate('xpack.ecsMapper.fetchPipeline.unexpectedErrorTitle', {
            defaultMessage: 'Something went wrong'
          })
        );
        setErrorDetails(
          i18n.translate('xpack.ecsMapper.createIngestNodePipeline.unexpectedError', {
            defaultMessage: 'Unexpected error {e}',
            values: { e },
          })
        );
      }
    } else {
      setErrorTitle('File too large');
      setErrorDetails('File is greater than allowed size of ' + maxBytes + 'bytes.');
    }
  };

  return (
    <EuiPage className="prfDevTool__page" data-test-subj="ecsMapperFileUpload">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
        
          <Instructions />
        
          <EuiHorizontalRule margin="l" />

          {hasError && <ErrorPanel errorTitle={errorTitle} errorDetails={errorDetails} />}

          {isPipelineCreated && <ResultsPanel onManageIngestPipeline={onManageIngestPipeline} />}

          {!isUploaded && (!isPipelineCreated || hasError) && (
            <UploadPanel
              onFilePickerChange={onFilePickerChange}
              onFileUpload={onFileUpload}
              actionOptions={Object.values(FieldCopyAction)}
              isLoading={isLoading}
              isUploaded={isUploaded}
              hasError={hasError}
              hasFile={!!file && file.length > 0}
            />
          )}

          <EuiSpacer size="m" />

          {isUploaded && (
            <PreviewPanel
              processors={pipelineProcessors}
              onDownload={onDownload}
              onUpdateProcessors={onUpdateProcessors}
              onClickToCreatePipeline={onClickToCreatePipeline}
              isCreatingPipeline={isCreatingPipeline}
            />
          )}

          {isCreatingPipeline && (
            <CreatePipelinePanel
              onCreatePipeline={onCreatePipeline}
              onCancel={onCancelCreate}
              isPipelineCreated={isPipelineCreated}
            />
          )}

        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
