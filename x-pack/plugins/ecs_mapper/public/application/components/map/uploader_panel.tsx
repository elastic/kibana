/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { MapperInformational } from './mapper_informational';

import './mapper_upload.scss';

interface Props {
  onFilePickerChange(files: FileList | null): void;
}

export const AboutPanel: FC<Props> = ({ onFilePickerChange }) => {
  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileUpload">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={true}>
              <MapperInformational />

              <EuiHorizontalRule margin="l" />

              <div style={{ alignContent: 'center' }}>
                <EuiFilePicker
                  id="filePicker"
                  initialPromptText={i18n.translate(
                    'xpack.ecsMapper.file.upload.selectOrDragAndDropFileDescription',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={(files) => onFilePickerChange(files)}
                  className="ecs-mapper-file-picker"
                />
              </div>
              <EuiSpacer size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const LoadingPanel: FC = () => {
  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileLoading">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <div style={{ textAlign: 'center' }}>
            <EuiTitle size="s">
              <h1 role="alert">
                <FormattedMessage
                  id="xpack.ecsMapper.file.upload.scanningTitle"
                  defaultMessage="Scanning"
                />
              </h1>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiLoadingSpinner size="xl" />
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const ResultsPanel: FC = () => {
  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperResultsLoaded">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <div style={{ textAlign: 'center' }}>
            <EuiTitle size="s">
              <h1 role="alert">
                <FormattedMessage
                  id="xpack.ecsMapper.file.upload.resultsTitle"
                  defaultMessage="Super exciting results coming soon...."
                />
              </h1>
            </EuiTitle>
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
