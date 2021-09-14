/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, useState } from 'react';
import { useKibana } from '../../../shared_imports';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFilePicker,
  EuiButton,
  EuiFormRow,
  EuiIconTip,
  EuiIcon,
  EuiRadioGroup,
} from '@elastic/eui';
import { FieldCopyAction } from '../../../../common/types';

interface Props {
  actionOptions: FieldCopyAction[];
  onFilePickerChange(files: FileList | null): void;
  onFileUpload(action: string | null): void;
  isLoading: boolean;
  isUploaded: boolean;
  hasError: boolean;
  hasFile: boolean;
}

function getOptions(actions: FieldCopyAction[]) {
  const actionOptions = actions.map((action) => ({
    id: action,
    label: action,
  }));

  return [...actionOptions];
}

export const PipelinesCsvUploader: FC<Props> = ({ actionOptions, onFilePickerChange, onFileUpload, isLoading, isUploaded, hasError, hasFile }) => {
  const [action, setAction] = useState<FieldCopyAction>(FieldCopyAction.Copy);
  const { services } = useKibana();

  const maxFileSize = services.fileUpload.getMaxBytesFormatted();

  const selectedAction = [];
  if (action) {
    selectedAction.push({ value: action, label: action });
  }

  const options = getOptions(actionOptions);

  return (
    <EuiFlexGroup gutterSize="xl">
      <EuiFlexItem grow={true}>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.ecsMapper.file.upload.filePickerTitle"
              defaultMessage="Upload file (up to {maxFileSize})"
                values={{ maxFileSize }}
            />
          }
        >
          <EuiFilePicker
            id="filePicker"
            initialPromptText={i18n.translate(
              'xpack.ecsMapper.fileUpload.selectOrDragAndDropFileDescription',
              {
                defaultMessage: 'Select or drag and drop a CSV file',
              }
            )}
            onChange={onFilePickerChange}
            className="ecs-mapper-file-picker"
            accept=".csv"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiFormRow
          fullWidth
          label={
            <p>
              Default copy action
              <EuiIconTip
                content="This is the default action for field renames, and will only be utilized if not provided for a field in the uploaded CSV."
                position="right"
              >
                <EuiIcon type="info"/>
              </EuiIconTip>
            </p>
          }
        >
          <EuiRadioGroup
            options={options}
            idSelected={action}
            onChange={(id) => setAction(id as FieldCopyAction)}
          />

        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            className="prfDevTool__profileButtonContainer"
            gutterSize="none"
            direction="row"
          >
            <EuiFlexItem grow={1}>
              <EuiButton
                onClick={() => onFileUpload(action)}
                isLoading={isLoading}
                isDisabled={!hasFile || isUploaded || hasError}
                data-test-subj="ecsMapperProcessFileButton"
                fill
              >
                <FormattedMessage id="xpack.ecsMapper.file.process.button" defaultMessage="Process CSV" />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={9}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
