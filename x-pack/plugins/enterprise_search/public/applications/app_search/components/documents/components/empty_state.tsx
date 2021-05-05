/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_PREFIX } from '../../../routes';

export const EmptyState = () => (
  <EuiPanel color="subdued" grow={false}>
    <EuiEmptyPrompt
      data-test-subj="EmptyDocumentPrompt"
      iconType="documents"
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documents.empty.title', {
            defaultMessage: 'Add your first documents',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documents.empty.description', {
            defaultMessage:
              'You can index documents using the App Search Web Crawler, by uploading JSON, or by using the API.',
          })}
        </p>
      }
      actions={
        <EuiButton
          size="s"
          target="_blank"
          iconType="popout"
          href={`${DOCS_PREFIX}/indexing-documents-guide.html`}
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.documents.empty.buttonLabel', {
            defaultMessage: 'Read the documents guide',
          })}
        </EuiButton>
      }
    />
  </EuiPanel>
);
