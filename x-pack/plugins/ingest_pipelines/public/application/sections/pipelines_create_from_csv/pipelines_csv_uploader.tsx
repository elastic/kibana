/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';
import {
  EuiSpacer,
  EuiFilePicker,
  EuiButton,
  EuiFormRow,
  EuiIconTip,
  EuiRadioGroup,
} from '@elastic/eui';

import { useKibana } from '../../../shared_imports';
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
  return actions.map((action) => ({
    id: action,
    label: action === FieldCopyAction.Copy ? 'Copy field name' : 'Rename field',
  }));
}

export const PipelinesCsvUploader: FC<Props> = ({
  actionOptions,
  onFilePickerChange,
  onFileUpload,
  isLoading,
  isUploaded,
  hasError,
  hasFile,
}) => {
  const [action, setAction] = useState<FieldCopyAction>(FieldCopyAction.Copy);
  const { services } = useKibana();

  const maxFileSize = services.fileUpload.getMaxBytesFormatted();

  const options = getOptions(actionOptions);

  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.ingestPipelines.createFromCsv.fileUpload.filePickerTitle"
            defaultMessage="Upload file (up to {maxFileSize})"
            values={{ maxFileSize }}
          />
        }
      >
        <EuiFilePicker
          id="filePicker"
          data-test-subj="csvFilePicker"
          initialPromptText={i18n.translate(
            'xpack.ingestPipelines.createFromCsv.fileUpload.selectOrDragAndDropFileDescription',
            {
              defaultMessage: 'Select or drag and drop a CSV file',
            }
          )}
          onChange={onFilePickerChange}
          accept=".csv"
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiFormRow
        fullWidth
        label={
          <p>
            Default action
            <EuiIconTip
              type="iInCircle"
              content={
                <FormattedMessage
                  id="xpack.ingestPipelines.createFromCsv.fileUpload.settingDescription"
                  defaultMessage="Whether to copy or rename the field if no action is specified in the CSV."
                />
              }
            />
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

      <div>
        <EuiButton
          onClick={() => onFileUpload(action)}
          isLoading={isLoading}
          isDisabled={!hasFile || isUploaded || hasError}
          data-test-subj="processFileButton"
          fill
        >
          <FormattedMessage
            id="xpack.ingestPipelines.createFromCsv.fileUpload.processButton"
            defaultMessage="Process CSV"
          />
        </EuiButton>
      </div>
    </>
  );
};
