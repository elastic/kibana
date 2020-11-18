/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButton } from '@elastic/eui';
import { useActions } from 'kea';

import { DocumentsLogic } from './documents_logic';

export const DocumentCreationButton: React.FC = () => {
  const { openDocumentCreation } = useActions(DocumentsLogic);

  return (
    <EuiButton
      fill={true}
      color="primary"
      onClick={openDocumentCreation}
      data-test-subj="IndexDocumentsButton"
    >
      {i18n.translate('xpack.enterpriseSearch.appSearch.documents.indexDocuments', {
        defaultMessage: 'Index documents',
      })}
    </EuiButton>
  );
};
