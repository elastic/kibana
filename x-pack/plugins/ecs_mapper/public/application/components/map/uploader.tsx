/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer } from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { UploadPanel } from './uploadPanel';
import { ConfirmationPanel } from './confirmationPanel';
import { ResultsPanel } from './resultsPanel';
import { ErrorPanel } from './errorPanel';
import { readFile } from '../util/utils';
import { FieldCopyAction } from '../../../../common';
import { MapperProxy } from '../../mapper_api';
import { FileUploadPluginStart } from '../../../../../file_upload/public';

export interface Props {
  fileUpload: FileUploadPluginStart;
  mapper: MapperProxy;
  navigateToApp(app: string, options: NavigateToAppOptions): void; // todo object type
}

export const EcsMapperUploadView: FC<Props> = ({ fileUpload, mapper, navigateToApp }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [isPipelineCreated, setIsPipelineCreated] = useState<boolean>(false);
  const [pipelineProcessors, setPipelineProcessors] = useState<object[]>([]);
  const [pipelineName, setPipelineName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const hasPermissionToImport = async () => {
    return await fileUpload.hasImportPermission({
      checkCreateIndexPattern: false,
      checkHasManagePipeline: true,
    });
  };

  const onManageIngestPipeline = () => {
    navigateToApp('management', {
      path: `/ingest/ingest_pipelines/edit/${pipelineName}`,
    });
  };

  const onFileUpload = async (action: FieldCopyAction, files: FileList, name: string) => {
    setPipelineName(name);

    if (files.length > 0) {
      setIsLoading(true);
      processFile(files[0], action);
    }
  };

  const onCreatePipeline = async () => {
    await mapper.createIngestNodePipeline(pipelineName, pipelineProcessors);
    setIsPipelineCreated(true);
  };

  const onCancelCreate = () => {
    setIsUploaded(false);
    setPipelineName('');
    setPipelineProcessors([]);
    setIsPipelineCreated(false);
  };

  const processFile = async (file: File, action: FieldCopyAction) => {
    const maxBytes = fileUpload.getMaxBytes();

    if (file.size <= maxBytes) {
      try {
        const fileContents = await readFile(file, maxBytes);

        const processors = await mapper.fetchPipelineFromMapping(fileContents, action);

        if (processors.length === 0) {
          setError('error'); // todo
        }

        setIsLoading(false);
        setIsUploaded(true);
        setPipelineProcessors(processors);
      } catch (e) {
        setIsLoading(false);
        setIsUploaded(false);
        setError('error'); // todo
      }
    } else {
      setError('File is greater than allowed size of ' + maxBytes + 'bytes.');
    }
  };

  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileUpload">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          {!isUploaded && !isPipelineCreated && (
            <UploadPanel
              onFileUpload={onFileUpload}
              actionOptions={Object.values(FieldCopyAction)}
              isLoading={isLoading}
              isUploaded={isUploaded}
            />
          )}

          <EuiSpacer size="m" />

          {isUploaded && (
            <ConfirmationPanel
              pipelineName={pipelineName}
              processors={pipelineProcessors}
              onCreatePipeline={onCreatePipeline}
              onCancel={onCancelCreate}
              isPipelineCreated={isPipelineCreated}
            />
          )}

          {isPipelineCreated && (
            <ResultsPanel
              pipelineName={pipelineName}
              onManageIngestPipeline={onManageIngestPipeline}
            />
          )}

          {error && <ErrorPanel error={error} />}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
