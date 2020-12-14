/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButton } from '@elastic/eui';

export const DocumentCreationButton: React.FC = () => {
  return (
    <EuiButton fill={true} color="primary" data-test-subj="IndexDocumentsButton">
      {i18n.translate('xpack.enterpriseSearch.appSearch.documents.indexDocuments', {
        defaultMessage: 'Index documents',
      })}
    </EuiButton>
  );
};
