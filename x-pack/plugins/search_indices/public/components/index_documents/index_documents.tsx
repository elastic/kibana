/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Result, resultToField, resultMetaData } from '@kbn/search-index-documents';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiProgress, EuiSpacer } from '@elastic/eui';
import { useIndexDocumentSearch } from '../../hooks/api/use_document_search';
import { useIndexMapping } from '../../hooks/api/use_index_mappings';
import { AddDocumentsCodeExample } from './add_documents_code_example';

import { DEFAULT_PAGE_SIZE } from './constants';
import { RecentDocsActionMessage } from './recent_docs_action_message';

interface IndexDocumentsProps {
  indexName: string;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({ indexName }) => {
  const { data: indexDocuments, isInitialLoading } = useIndexDocumentSearch(indexName, {
    pageSize: DEFAULT_PAGE_SIZE,
    pageIndex: 0,
  });

  const { data: mappingData } = useIndexMapping(indexName);

  const docs = indexDocuments?.results?.data ?? [];
  const mappingProperties = mappingData?.mappings?.properties ?? {};

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {isInitialLoading && <EuiProgress size="xs" color="primary" />}
          {!isInitialLoading && docs.length === 0 && <AddDocumentsCodeExample />}
          {docs.length > 0 && (
            <>
              <RecentDocsActionMessage indexName={indexName} />
              <EuiSpacer size="m" />
              {docs.map((doc) => {
                return (
                  <React.Fragment key={doc._id}>
                    <Result
                      fields={resultToField(doc, mappingProperties)}
                      metaData={resultMetaData(doc)}
                    />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
