/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexDetailsTab } from '@kbn/index-management-plugin/common/constants';
import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { Index } from '@kbn/index-management-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { IndexDocuments } from './documents';
interface DocumentsTabProps {
  index: Index;
  core: CoreStart;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ index, core }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <IndexDocuments indexName={index.name} http={core.http} />
      </I18nProvider>
    </QueryClientProvider>
  );
};
export const createDocumentsTab = (core: CoreStart): IndexDetailsTab => {
  return {
    id: 'documents',
    name: (
      <FormattedMessage
        defaultMessage="Documents"
        id="xpack.serverlessSearch.indexManagementTab.documents"
      />
    ),
    order: 11,
    renderTabContent: ({ index }) => <DocumentsTab core={core} index={index} />,
  };
};
