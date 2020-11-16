/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiTitle,
  EuiText,
  EuiCode,
  EuiLink,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';

import { DOCS_PREFIX } from '../../routes';

import { EngineLogic } from '../engine';

// TODO
// import { DocumentCreationButtons, CodeExample } from '../document_creation'

export const EmptyEngineOverview: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  return (
    <>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.empty.heading', {
                defaultMessage: 'Engine Setup',
              })}
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>
          <EuiButton href={`${DOCS_PREFIX}/index.html`} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.overview.empty.headingAction',
              { defaultMessage: 'View Documentation' }
            )}
          </EuiButton>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.empty.subheading', {
                defaultMessage: 'Set up the “{engineName}” Engine',
                values: { engineName },
              })}
            </h2>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.engine.overview.empty.description"
                defaultMessage="There are three ways to send documents to your Engine for indexing. You can paste raw JSON, upload a {jsonCode} file, or {postCode} to the {documentsApiLink} endpoint. Click on your choice below or see {apiStrong}."
                values={{
                  jsonCode: <EuiCode>.json</EuiCode>,
                  postCode: <EuiCode>POST</EuiCode>,
                  documentsApiLink: (
                    <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
                      Documents API
                    </EuiLink>
                  ),
                  apiStrong: <strong>Indexing by API</strong>,
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer />
          {/* TODO: <DocumentCreationButtons /> */}
        </EuiPageContentBody>

        <EuiPageContentHeader>
          <EuiTitle>
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.overview.empty.api.heading',
                { defaultMessage: 'Indexing by API' }
              )}
            </h3>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.engine.overview.empty.api.description1"
                defaultMessage="The {documentsApiLink} can be used to add new documents to your Engine, update documents, retrieve documents by id, and delete documents. There are a variety of {clientLibrariesLink} to help you get started."
                values={{
                  documentsApiLink: (
                    <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
                      Documents API
                    </EuiLink>
                  ),
                  clientLibrariesLink: (
                    <EuiLink target="_blank" href={`${DOCS_PREFIX}/api-clients.html`}>
                      client libraries
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.engine.overview.empty.api.description2"
                defaultMessage="To see the API in action, you can experiment with the example request below using a command line or a client library."
              />
            </p>
          </EuiText>
          <EuiSpacer />
          {/* <DocumentApiCodeExample engineName={engineName} apiKey={apiKey} /> */}
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
