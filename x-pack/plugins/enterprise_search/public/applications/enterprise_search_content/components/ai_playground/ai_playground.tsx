/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageTemplate } from '@elastic/eui';
import { Chat, EmptyIndex, AIPlaygroundProvider, ViewQueryAction } from '@kbn/ai-playground';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { NEW_INDEX_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { IndicesLogic } from '../search_indices/indices_logic';

export const AIPlayground: React.FC = () => {
  const { fetchIndices } = useActions(IndicesLogic);
  const { hasNoIndices, isLoading } = useValues(IndicesLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const handleNavigateToIndex = useCallback(() => navigateToUrl(NEW_INDEX_PATH), [navigateToUrl]);

  useEffect(() => {
    fetchIndices({
      from: 0,
      onlyShowSearchOptimizedIndices: false,
      returnHiddenIndices: false,
      size: 20,
    });
  }, []);

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
          rightSideItems: [<ViewQueryAction key="viewQueryAction" />],
        }}
        pageViewTelemetry="AI Playground"
        restrictWidth={false}
        isLoading={isLoading}
        customPageSections
        bottomBorder="extended"
      >
        {hasNoIndices ? (
          <EmptyIndex onCreateIndexClick={handleNavigateToIndex} />
        ) : (
          <EuiPageTemplate.Section
            alignment="top"
            restrictWidth={false}
            grow
            contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
            paddingSize="none"
          >
            <Chat />
          </EuiPageTemplate.Section>
        )}
      </EnterpriseSearchContentPageTemplate>
    </AIPlaygroundProvider>
  );
};
