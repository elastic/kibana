/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiTextArea, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { ConfiguredLimits } from '../../../types';
import { DocumentCreationLogic } from '../';

import './paste_json_text.scss';

export const PasteJsonText: React.FC = () => {
  const { configuredLimits } = useValues(AppLogic);
  const {
    engine: { maxDocumentByteSize },
  } = configuredLimits as ConfiguredLimits;

  const { textInput } = useValues(DocumentCreationLogic);
  const { setTextInput } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.pasteJsonText.title', {
            defaultMessage: 'Create documents',
          })}
        </h3>
      </EuiTitle>
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
    </>
  );
};
