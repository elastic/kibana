/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import fileSaver from 'file-saver';

import { FieldCopyAction, Processor } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { PipelinesCsvUploader } from './pipelines_csv_uploader';
import { PipelinesPreview } from './pipelines_preview';
import { Error } from './error_display';
import { Instructions } from './instructions';

export const PipelinesCreateFromCsv: React.FunctionComponent<RouteComponentProps> = ({
  history,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [pipelineProcessors, setPipelineProcessors] = useState<Processor[]>([]);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);
  const [file, setFile] = useState<FileList | null>(null);

  const hasError = errorInfo !== null;

  const { services } = useKibana();

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

  const onFilePickerChange = (files: FileList) => {
    setErrorInfo(null);
    setFile(files);
  };

  const onFileUpload = async (action: FieldCopyAction) => {
    if (file != null && file.length > 0) {
      await processFile(file[0], action);
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
    history.push({ pathname: '/create', state: { sourcePipeline: pipelineProcessors } });
  };

  const processFile = async (csv: File, action: FieldCopyAction) => {
    const maxBytes = services.fileUpload.getMaxBytes();

    if (csv.size === 0) {
      setErrorInfo({
        title: i18n.translate(
          'xpack.ingestPipelines.createFromCsv.processFile.emptyFileErrorTitle',
          {
            defaultMessage: 'File is empty',
          }
        ),
        message: i18n.translate('xpack.ingestPipelines.createFromCsv.processFile.emptyFileError', {
          defaultMessage: 'The file provided is empty.',
        }),
      });
    } else if (csv.size > maxBytes) {
      setErrorInfo({
        title: i18n.translate(
          'xpack.ingestPipelines.createFromCsv.processFile.fileTooLargeErrorTitle',
          {
            defaultMessage: 'File too large',
          }
        ),
        message: i18n.translate(
          'xpack.ingestPipelines.createFromCsv.processFile.fileTooLargeError',
          {
            defaultMessage: 'File is greater than allowed size of {maxBytes} bytes.',
            values: { maxBytes },
          }
        ),
      });
    } else {
      try {
        setIsLoading(true);
        setIsUploaded(false);

        const fileContents = await services.fileReader.readFile(csv, maxBytes);
        const success = await fetchPipelineFromMapping(fileContents, action);

        setIsLoading(false);
        if (success) {
          setIsUploaded(true);
        }
      } catch (e) {
        setIsLoading(false);
        setErrorInfo({
          title: i18n.translate(
            'xpack.ingestPipelines.createFromCsv.processFile.unexpectedErrorTitle',
            {
              defaultMessage: 'Error reading file',
            }
          ),
          message: i18n.translate(
            'xpack.ingestPipelines.createFromCsv.processFile.unexpectedError',
            {
              defaultMessage: 'The file provided could not be read.',
            }
          ),
        });
      }
    }
  };

  const fetchPipelineFromMapping = async (fileContents: string, action: FieldCopyAction) => {
    const { error, data: processors } = await services.api.parseCsv({
      file: fileContents,
      copyAction: action,
    });
    setPipelineProcessors(processors);

    if (!!error) {
      try {
        const errorParts = error.message.split(':');
        setErrorInfo({ title: errorParts[0], message: errorParts[1] });
      } catch (e) {
        setErrorInfo({
          title: i18n.translate(
            'xpack.ingestPipelines.createFromCsv.fetchPipeline.unexpectedErrorTitle',
            {
              defaultMessage: 'Something went wrong',
            }
          ),
          message: i18n.translate(
            'xpack.ingestPipelines.createFromCsv.fetchPipeline.unexpectedErrorDetails',
            {
              defaultMessage: 'Unexpected error',
            }
          ),
        });
      }
    }

    return error === null;
  };

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.createFromCsv.pageTitle"
              defaultMessage="Create pipeline from CSV"
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={services.documentation.getCreatePipelineCSVUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.createFromCSV.docsButtonLabel"
              defaultMessage="CSV to pipeline docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="xl" />

      <Instructions />

      {hasError && <Error error={errorInfo!} />}

      <EuiSpacer size="xl" />

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
