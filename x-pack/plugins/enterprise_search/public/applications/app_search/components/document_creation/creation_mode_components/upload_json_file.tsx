/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import {
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { ConfiguredLimits } from '../../../types';

import { MODAL_CANCEL_BUTTON, MODAL_CONTINUE_BUTTON } from '../constants';
import { DocumentCreationLogic } from '../';

export const UploadJsonFile: React.FC = () => (
  <>
    <ModalHeader />
    <ModalBody />
    <ModalFooter />
  </>
);

export const ModalHeader: React.FC = () => {
  return (
    <EuiModalHeader>
      <EuiModalHeaderTitle>
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.uploadJsonFile.title',
            { defaultMessage: 'Drag and drop .json' }
          )}
        </h2>
      </EuiModalHeaderTitle>
    </EuiModalHeader>
  );
};

export const ModalBody: React.FC = () => {
  const { configuredLimits } = useValues(AppLogic);
  const {
    engine: { maxDocumentByteSize },
  } = configuredLimits as ConfiguredLimits;

  const { setFileInput } = useActions(DocumentCreationLogic);

  return (
    <EuiModalBody>
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
        onChange={(files) => files && setFileInput(files)}
        accept="application/json"
        fullWidth
      />
    </EuiModalBody>
  );
};

export const ModalFooter: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiModalFooter>
      <EuiButtonEmpty onClick={closeDocumentCreation}>{MODAL_CANCEL_BUTTON}</EuiButtonEmpty>
      <EuiButton fill>{MODAL_CONTINUE_BUTTON}</EuiButton>
    </EuiModalFooter>
  );
};
