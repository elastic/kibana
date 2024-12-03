/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  DocumentList,
  DocumentsOverview,
  INDEX_DOCUMENTS_META_DEFAULT,
} from '@kbn/search-index-documents';

import { i18n } from '@kbn/i18n';
import { useIndexDocumentSearch } from '../../hooks/api/use_index_documents';
import { useIndexMappings } from '../../hooks/api/use_index_mappings';

const DEFAULT_PAGINATION = {
  pageIndex: INDEX_DOCUMENTS_META_DEFAULT.pageIndex,
  pageSize: INDEX_DOCUMENTS_META_DEFAULT.pageSize,
  totalItemCount: INDEX_DOCUMENTS_META_DEFAULT.totalItemCount,
};

interface IndexDocumentsProps {
  indexName: string;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({ indexName }) => {
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryCallback = (query: string) => {
    setSearchQuery(query);
  };
  const { results: indexDocuments, meta: documentsMeta } = useIndexDocumentSearch(
    indexName,
    pagination,
    searchQuery
  );

  const { data: mappingData } = useIndexMappings(indexName);

  const docs = indexDocuments?.data ?? [];

  useEffect(() => {
    setSearchQuery('');
    setPagination(DEFAULT_PAGINATION);
  }, [indexName]);
  return (
    <DocumentsOverview
      dataTelemetryIdPrefix="serverless-view-index-documents"
      searchQueryCallback={searchQueryCallback}
      documentComponent={
        <>
          {docs.length === 0 &&
            i18n.translate('xpack.serverlessSearch.indexManagementTab.documents.noMappings', {
              defaultMessage: 'No documents found for index',
            })}
          {docs?.length > 0 && (
            <DocumentList
              dataTelemetryIdPrefix="serverless-view-index-documents"
              docs={docs}
              docsPerPage={pagination.pageSize ?? 10}
              isLoading={false}
              mappings={mappingData ? { [indexName]: mappingData } : undefined}
              meta={documentsMeta ?? DEFAULT_PAGINATION}
              onPaginate={(pageIndex) => setPagination({ ...pagination, pageIndex })}
              setDocsPerPage={(pageSize) => setPagination({ ...pagination, pageSize })}
            />
          )}
        </>
      }
    />
  );
};

// Default Export is needed to lazy load this react component
// eslint-disable-next-line import/no-default-export
export default IndexDocuments;
