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

import './mapperUpload.scss';

interface Props {
  actionOptions: FieldCopyAction[];
  onFileUpload(action: string | null, files: FileList | null, pipeline: string): void;
  isLoading: boolean;
  isUploaded: boolean;
}

function getOptions(actions: FieldCopyAction[]) {
  const actionOptions = actions.map((action) => ({
    value: action,
    text: action,
  }));

  return [...actionOptions];
}

export const UploadPanel: FC<Props> = ({ actionOptions, onFileUpload, isLoading, isUploaded }) => {
  const [action, setAction] = useState<FieldCopyAction>(FieldCopyAction.Copy);
  const [file, setFile] = useState<FileList | null>(null);
  const [pipelineName, setPipelineName] = useState('');

  const selectedAction = [];
  if (action) {
    selectedAction.push({ value: action, label: action });
  }

  const options = getOptions(actionOptions);

  return (
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
                defaultMessage="This is the default action for field renames."
              />
            </p>
          }
        >
          <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
            <EuiSelect
              options={options}
              value={action}
              onChange={(option) => setAction(option.target.value as FieldCopyAction)}
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
                defaultMessage="This is the name for the Ingest Node Pipeline that will be created from the CSV mapping."
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

        <EuiFormRow fullWidth>
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
            accept=".csv"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        {!isUploaded && (
          <EuiButton
            target="_self"
            onClick={() => onFileUpload(action, file, pipelineName)}
            isLoading={isLoading}
            data-test-subj="ecsMapperProcessFileButton"
            fill
          >
            <FormattedMessage id="xpack.ecsMapper.file.process.button" defaultMessage="Process" />
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
