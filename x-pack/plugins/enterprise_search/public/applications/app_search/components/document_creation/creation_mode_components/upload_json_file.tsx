/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL, CONTINUE_BUTTON_LABEL } from '../../../../shared/constants';
import { AppLogic } from '../../../app_logic';

import { DocumentCreationLogic } from '../index';

export const UploadJsonFileTabContent: React.FC = () => {
  const {
    configuredLimits: {
      engine: { maxDocumentByteSize },
    },
  } = useValues(AppLogic);

  const { isUploading, errors } = useValues(DocumentCreationLogic);
  const { setFileInput } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiText color="subdued">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.uploadJsonFile.label',
            {
              defaultMessage:
                'If you have a .json file, drag and drop or upload it. Ensure the JSON is valid and that each document object is less than {maxDocumentByteSize} bytes.',
              values: { maxDocumentByteSize },
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFilePicker
        onChange={(files) => setFileInput(files?.length ? files[0] : null)}
        accept="application/json"
        fullWidth
        isLoading={isUploading}
        isInvalid={errors.length > 0}
      />
    </>
  );
};

export const UploadJsonFileFooterContent: React.FC = () => {
  const { fileInput, isUploading } = useValues(DocumentCreationLogic);
  const { onSubmitFile, closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={closeDocumentCreation}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onSubmitFile} isLoading={isUploading} isDisabled={!fileInput}>
          {CONTINUE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
