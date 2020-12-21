/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTextArea,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { AppLogic } from '../../../app_logic';

import { FLYOUT_ARIA_LABEL_ID, FLYOUT_CANCEL_BUTTON, FLYOUT_CONTINUE_BUTTON } from '../constants';
import { DocumentCreationLogic } from '../';

import './paste_json_text.scss';

export const PasteJsonText: React.FC = () => (
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
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.pasteJsonText.title', {
            defaultMessage: 'Create documents',
          })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  const { configuredLimits } = useValues(AppLogic);
  const maxDocumentByteSize = configuredLimits?.engine?.maxDocumentByteSize;

  const { textInput } = useValues(DocumentCreationLogic);
  const { setTextInput } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutBody>
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
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  const { textInput } = useValues(DocumentCreationLogic);
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={closeDocumentCreation}>{FLYOUT_CANCEL_BUTTON}</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill isDisabled={!textInput.length}>
            {FLYOUT_CONTINUE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
