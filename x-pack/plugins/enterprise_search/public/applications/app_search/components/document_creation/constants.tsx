/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode, EuiLink } from '@elastic/eui';

import { DOCS_PREFIX } from '../../routes';

export const DOCUMENT_CREATION_DESCRIPTION = (
  <FormattedMessage
    id="xpack.enterpriseSearch.appSearch.engine.documentCreation.description"
    defaultMessage="There are three ways to send documents to your engine for indexing. You can paste raw JSON, upload a {jsonCode} file, or {postCode} to the {documentsApiLink} endpoint. Click on your choice below or see {apiStrong}."
    values={{
      jsonCode: <EuiCode>.json</EuiCode>,
      postCode: <EuiCode>POST</EuiCode>,
      documentsApiLink: (
        <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
          documents API
        </EuiLink>
      ),
      apiStrong: <strong>Indexing by API</strong>,
    }}
  />
);

export const DOCUMENT_API_INDEXING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.documentCreation.api.title',
  { defaultMessage: 'Indexing by API' }
);

export const DOCUMENT_API_INDEXING_DESCRIPTION = (
  <FormattedMessage
    id="xpack.enterpriseSearch.appSearch.engine.documentCreation.api.description"
    defaultMessage="The {documentsApiLink} can be used to add new documents to your engine, update documents, retrieve documents by id, and delete documents. There are a variety of {clientLibrariesLink} to help you get started."
    values={{
      documentsApiLink: (
        <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
          documents API
        </EuiLink>
      ),
      clientLibrariesLink: (
        <EuiLink target="_blank" href={`${DOCS_PREFIX}/api-clients.html`}>
          client libraries
        </EuiLink>
      ),
    }}
  />
);
