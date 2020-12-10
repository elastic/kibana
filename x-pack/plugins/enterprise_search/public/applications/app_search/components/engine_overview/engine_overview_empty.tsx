/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';

import { EngineLogic } from '../engine';

import { DOCS_PREFIX } from '../../routes';
import {
  DOCUMENT_CREATION_DESCRIPTION,
  DOCUMENT_API_INDEXING_TITLE,
  DOCUMENT_API_INDEXING_DESCRIPTION,
} from '../document_creation/constants';
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
                defaultMessage: 'Engine setup',
              })}
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>
          <EuiButton href={`${DOCS_PREFIX}/index.html`} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.overview.empty.headingAction',
              { defaultMessage: 'View documentation' }
            )}
          </EuiButton>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.empty.subheading', {
                defaultMessage: 'Setting up the “{engineName}” engine',
                values: { engineName },
              })}
            </h2>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiText color="subdued">
            <p>{DOCUMENT_CREATION_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer />
          {/* TODO: <DocumentCreationButtons /> */}
        </EuiPageContentBody>

        <EuiPageContentHeader>
          <EuiTitle>
            <h3>{DOCUMENT_API_INDEXING_TITLE}</h3>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiText color="subdued">
            <p>{DOCUMENT_API_INDEXING_DESCRIPTION}</p>
            <p>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.empty.apiExample', {
                defaultMessage:
                  'To see the API in action, you can experiment with the example request below using a command line or a client library.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          {/* <DocumentApiCodeExample engineName={engineName} apiKey={apiKey} /> */}
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
