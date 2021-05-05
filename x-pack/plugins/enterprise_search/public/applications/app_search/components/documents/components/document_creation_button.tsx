/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocumentCreationLogic, DocumentCreationFlyout } from '../../document_creation';

export const DocumentCreationButton: React.FC = () => {
  const { showCreationModes } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiButton
        fill
        color="primary"
        data-test-subj="IndexDocumentsButton"
        onClick={showCreationModes}
      >
        {i18n.translate('xpack.enterpriseSearch.appSearch.documents.indexDocuments', {
          defaultMessage: 'Index documents',
        })}
      </EuiButton>
      <DocumentCreationFlyout />
    </>
  );
};
