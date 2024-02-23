/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useValues } from 'kea';

import { EuiPageTemplate } from '@elastic/eui';
import {
  Chat,
  AIPlaygroundProvider,
  ViewQueryAction,
  ViewCodeAction,
} from '@kbn/ai-playground';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { NEW_INDEX_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { IndicesLogic } from '../search_indices/indices_logic';

export const AIPlayground: React.FC = () => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const handleNavigateToIndex = useCallback(() => navigateToUrl(NEW_INDEX_PATH), [navigateToUrl]);

  return (
    <AIPlaygroundProvider>
      <EnterpriseSearchContentPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.aiPlayground.breadcrumb', {
            defaultMessage: 'AI Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: i18n.translate('xpack.enterpriseSearch.content.aiPlayground.headerTitle', {
            defaultMessage: 'AI Playground',
          }),
          rightSideItems: [
            <ViewCodeAction key="viewCodeAction" />,
            <ViewQueryAction key="viewQueryAction" />,
          ],
        }}
        pageViewTelemetry="AI Playground"
        restrictWidth={false}
        isLoading={isLoading}
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
