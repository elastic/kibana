/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_URL } from '../../routes';
import { DocumentCreationButtons, DocumentCreationFlyout } from '../document_creation';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

export const EmptyEngineOverview: React.FC = () => {
  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs()}
      pageHeader={{
        pageTitle: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.overview.empty.heading',
          { defaultMessage: 'Engine setup' }
        ),
        rightSideItems: [
          <EuiButton href={DOCS_URL} target="_blank" iconType="popout">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.overview.empty.headingAction',
              { defaultMessage: 'View documentation' }
            )}
          </EuiButton>,
        ],
      }}
      data-test-subj="EngineOverview"
    >
      <DocumentCreationButtons />
      <DocumentCreationFlyout />
    </AppSearchPageTemplate>
  );
};
