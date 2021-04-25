/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiPageContentBody, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { DOCS_PREFIX } from '../../routes';
import { DocumentCreationButtons, DocumentCreationFlyout } from '../document_creation';

export const EmptyEngineOverview: React.FC = () => {
  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.overview.empty.heading',
          { defaultMessage: 'Engine setup' }
        )}
        rightSideItems={[
          <EuiButton href={`${DOCS_PREFIX}/index.html`} target="_blank" iconType="popout">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.overview.empty.headingAction',
              { defaultMessage: 'View documentation' }
            )}
          </EuiButton>,
        ]}
      />
      <FlashMessages />
      <EuiPageContentBody>
        <DocumentCreationButtons />
        <DocumentCreationFlyout />
      </EuiPageContentBody>
    </>
  );
};
