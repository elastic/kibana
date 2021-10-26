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
    label: action,
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

  const selectedAction = [];
  if (action) {
    selectedAction.push({ value: action, label: action });
  }

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
            Default copy action
            <EuiIconTip
              type="iInCircle"
              content={
                <FormattedMessage
                  id="xpack.ingestPipelines.createFromCsv.fileUpload.settingDescription"
                  defaultMessage="This is the default action for field renames, and will only be utilized if not provided for a field in the uploaded CSV."
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
