/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContentBody,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

import { DOCS_PREFIX } from '../../routes';
import { DocumentCreationButtons, DocumentCreationFlyout } from '../document_creation';

export const EmptyEngineOverview: React.FC = () => {
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
      <EuiPageContentBody>
        <DocumentCreationButtons />
        <DocumentCreationFlyout />
      </EuiPageContentBody>
    </>
  );
};
