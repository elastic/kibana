/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useValues } from 'kea';

import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Chat, AIPlaygroundProvider, ViewQueryAction, ViewCodeAction } from '@kbn/playground';

import { KibanaLogic } from '../../../shared/kibana';
import { NEW_INDEX_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const Playground: React.FC = () => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const handleNavigateToIndex = useCallback(() => navigateToUrl(NEW_INDEX_PATH), [navigateToUrl]);

  return (
    <AIPlaygroundProvider navigateToIndexPage={handleNavigateToIndex}>
      <EnterpriseSearchContentPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.playground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: i18n.translate('xpack.enterpriseSearch.content.playground.headerTitle', {
            defaultMessage: 'Playground',
          }),
          rightSideItems: [
            <ViewCodeAction key="viewCodeAction" />,
            <ViewQueryAction key="viewQueryAction" />,
          ],
        }}
        pageViewTelemetry="Playground"
        restrictWidth={false}
        customPageSections
        bottomBorder="extended"
      >
        <EuiPageTemplate.Section
          alignment="top"
          restrictWidth={false}
          grow
          contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
          paddingSize="none"
        >
          <Chat />
        </EuiPageTemplate.Section>
      </EnterpriseSearchContentPageTemplate>
    </AIPlaygroundProvider>
  );
};
