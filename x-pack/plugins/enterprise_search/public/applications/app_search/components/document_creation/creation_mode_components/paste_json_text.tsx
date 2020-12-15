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
  EuiTextArea,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { ConfiguredLimits } from '../../../types';

import { MODAL_CANCEL_BUTTON, MODAL_CONTINUE_BUTTON } from '../constants';
import { DocumentCreationLogic } from '../';

import './paste_json_text.scss';

export const PasteJsonText: React.FC = () => (
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
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.pasteJsonText.title', {
            defaultMessage: 'Create documents',
          })}
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

  const { textInput } = useValues(DocumentCreationLogic);
  const { setTextInput } = useActions(DocumentCreationLogic);

  return (
    <EuiModalBody>
      <EuiText color="subdued">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.pasteJsonText.description',
            {
              defaultMessage:
                'Paste an array of JSON documents. Ensure the JSON is valid and that each document object is less than {maxDocumentByteSize} bytes.',
              values: { maxDocumentByteSize },
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiTextArea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.documentCreation.pasteJsonText.label',
          { defaultMessage: 'Paste JSON here' }
        )}
        className="pasteJsonTextArea"
        fullWidth
        rows={12}
      />
    </EuiModalBody>
  );
};

export const ModalFooter: React.FC = () => {
  const { textInput } = useValues(DocumentCreationLogic);
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiModalFooter>
      <EuiButtonEmpty onClick={closeDocumentCreation}>{MODAL_CANCEL_BUTTON}</EuiButtonEmpty>
      <EuiButton fill isDisabled={!textInput.length}>
        {MODAL_CONTINUE_BUTTON}
      </EuiButton>
    </EuiModalFooter>
  );
};
