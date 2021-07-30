/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiButton,
  EuiSelect,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiFieldText,
} from '@elastic/eui';
import { FieldCopyAction } from '../../../../common';
import { Instructions } from './instructions';
import { formatActionsForSelector } from './helpers';

import './mapper_upload.scss';
import { ResultsPanel } from './results_panel';

interface Props {
  actionOptions: FieldCopyAction[];
  onFileUpload(action: string | null, files: FileList | null, pipeline: string): void;
}

export const UploadPanel: FC<Props> = ({ 
  actionOptions,
  onFileUpload
}) => {
  const [action, setAction] = useState<FieldCopyAction | null>(FieldCopyAction.Copy);
  const [file, setFile] = useState<FileList | null>(null);
  const [pipelineName, setPipelineName] = useState('');

  const selectedAction = [];
  if (action) {
    selectedAction.push({ value: action, label: action });
  }

  return (
    <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileUpload">
      <EuiPageBody className="prfDevTool__page__pageBody">
        <EuiPageContent className="prfDevTool__page__pageBodyContent">
          <EuiFlexGroup gutterSize="xl">

            <EuiFlexItem grow={true}>
              <Instructions />
              <EuiHorizontalRule margin="l" />

              <EuiDescribedFormGroup
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.ecsMapper.file.upload.copyAction.title"
                      defaultMessage="Copy action"
                    />
                  </h3>
                }
                description={
                  <p>
                    <FormattedMessage
                      id="xpack.ecsMapper.file.upload.copyAction.description"
                      defaultMessage="TBD description"
                    />
                  </p>
                }
              >
                <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
                  <EuiSelect
                    options={formatActionsForSelector(actionOptions)}
                    valueOfSelected={selectedAction}
                    onChange={(option) => setAction(option[0] ? option[0].label as FieldCopyAction : null)}
                    data-test-subj="copyAction"
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.ecsMapper.file.upload.pipelineName.title"
                      defaultMessage="Ingest Node Pipeline name"
                    />
                  </h3>
                }
                description={
                  <p>
                    <FormattedMessage
                      id="xpack.ecsMapper.file.upload.pipelineName.description"
                      defaultMessage="TBD description"
                    />
                  </p>
                }
              >
                <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
                  <EuiFieldText
                    onChange={(e) => {
                      setPipelineName(e.target.value);
                    }}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>
              
              <EuiSpacer size="l" />

              <div style={{ alignContent: 'center' }}>
                <EuiFilePicker
                  id="filePicker"
                  initialPromptText={i18n.translate(
                    'xpack.ecsMapper.file.upload.selectOrDragAndDropFileDescription',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={(files) => setFile(files)}
                  className="ecs-mapper-file-picker"
                />

              </div>

              <EuiSpacer size="l" />

              <EuiButton
                target="_self"
                onClick={() => onFileUpload(action, file, pipelineName)}
                data-test-subj="ecsMapperManagePipelineButton"
                >
                <FormattedMessage
                  id="xpack.ecsMapper.manageIngestPipeline"
                  defaultMessage="Upload"
                />
              </EuiButton>
              
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
