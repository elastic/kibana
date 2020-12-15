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
import { EuiFilePicker, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { ConfiguredLimits } from '../../../types';
import { DocumentCreationLogic } from '../';

export const UploadJsonFile: React.FC = () => {
  const { configuredLimits } = useValues(AppLogic);
  const {
    engine: { maxDocumentByteSize },
  } = configuredLimits as ConfiguredLimits;

  const { setFileInput } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.uploadJsonFile.title',
            { defaultMessage: 'Drag and drop .json' }
          )}
        </h3>
      </EuiTitle>
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
    </>
  );
};
