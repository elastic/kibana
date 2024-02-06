/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { IndicesLogic } from '../search_indices/indices_logic';

import { Chat } from './components/chat';
import { EmptyIndex } from './components/empty_index';

export const AIPlayground: React.FC = () => {
  const { fetchIndices } = useActions(IndicesLogic);
  const { hasNoIndices, isLoading } = useValues(IndicesLogic);

  useEffect(() => {
    fetchIndices({
      from: 0,
      onlyShowSearchOptimizedIndices: false,
      returnHiddenIndices: false,
      size: 20,
    });
  }, []);

  return (
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
        rightSideItems: [],
      }}
      pageViewTelemetry="AI Playground"
      isLoading={isLoading}
      customPageSections
      bottomBorder="extended"
    >
      {hasNoIndices ? (
        <EmptyIndex />
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
  );
};
