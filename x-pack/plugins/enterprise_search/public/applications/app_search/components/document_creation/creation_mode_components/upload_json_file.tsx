/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../../app_logic';

import { FLYOUT_ARIA_LABEL_ID, FLYOUT_CANCEL_BUTTON, FLYOUT_CONTINUE_BUTTON } from '../constants';
import { Errors } from '../creation_response_components';
import { DocumentCreationLogic } from '../index';

export const UploadJsonFile: React.FC = () => (
  <>
    <FlyoutHeader />
    <FlyoutBody />
    <FlyoutFooter />
  </>
);

export const FlyoutHeader: React.FC = () => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={FLYOUT_ARIA_LABEL_ID}>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.uploadJsonFile.title',
            { defaultMessage: 'Drag and drop .json' }
          )}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  const { configuredLimits } = useValues(AppLogic);
  const maxDocumentByteSize = configuredLimits?.engine?.maxDocumentByteSize;

  const { isUploading, errors } = useValues(DocumentCreationLogic);
  const { setFileInput } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutBody banner={<Errors />}>
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
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  const { fileInput, isUploading } = useValues(DocumentCreationLogic);
  const { onSubmitFile, closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={closeDocumentCreation}>{FLYOUT_CANCEL_BUTTON}</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onSubmitFile} isLoading={isUploading} isDisabled={!fileInput}>
            {FLYOUT_CONTINUE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
