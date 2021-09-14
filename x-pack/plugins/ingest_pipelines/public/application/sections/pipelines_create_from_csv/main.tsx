/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import fileSaver from 'file-saver';
import { PipelinesCsvUploader } from './pipelines_csv_uploader';
import { PipelinesPreview } from './pipelines_preview';
import { Error } from './error_display';
import { Instructions } from './instructions';
import { readFile } from '../../lib/utils';
import { FieldCopyAction, Processor } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';

export const PipelinesCreateFromCsv: React.FunctionComponent<RouteComponentProps> = ({
  history,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [pipelineProcessors, setPipelineProcessors] = useState<Processor[]>([]);
  const [errorTitle, setErrorTitle] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [file, setFile] = useState<FileList | null>(null);

  const hasError = !!errorTitle || !!errorDetails;

  const { services } = useKibana();

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

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

  const onUpdateProcessors = (updatedProcessors: Processor[]) => {
    setPipelineProcessors(updatedProcessors);
  };

  const onDownload = () => {
    const jsonBlob = new Blob([JSON.stringify(pipelineProcessors)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `my-mappings.json`);
  };

  const onClickToCreatePipeline = () => {
    history.push({pathname: '/create', state: {"sourcePipeline": pipelineProcessors}});
  };

  const processFile = async (file: File, action: FieldCopyAction) => {
    const maxBytes = services.fileUpload.getMaxBytes();

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

  const fetchPipelineFromMapping = async (fileContents: string, action: FieldCopyAction) => {
    const { error, data: processors } = await services.api.mapToPipeline({file: fileContents, copyAction: action});
    setPipelineProcessors(processors);
    setIsLoading(false);
    setIsUploaded(true);

    if (!!error) {
      try {
        const errorParts = error.message.split(":");
        setErrorTitle(errorParts[0]);
        setErrorDetails(errorParts[1]);
      } catch (e) {
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

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.createFromCsv.pageTitle"
              defaultMessage="Create new pipeline from CSV"
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={services.documentation.getPutPipelineApiUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.create.docsButtonLabel"
              defaultMessage="Create pipeline docs"
            />
          </EuiButtonEmpty>,
        ]}
      /> 

      <EuiSpacer size="m" />

      <Instructions />

      {hasError && <Error errorTitle={errorTitle} errorDetails={errorDetails} />}

      {(!isUploaded || hasError) && (
        <PipelinesCsvUploader
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
        <PipelinesPreview
          processors={pipelineProcessors}
          onDownload={onDownload}
          onUpdateProcessors={onUpdateProcessors}
          onClickToCreatePipeline={onClickToCreatePipeline}
          hasError={hasError}
        />
      )}
    </>
  );
};
