/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { DocumentList } from '@kbn/search-index-documents';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { IndicesGetMappingResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { Pagination } from '../../types';
import { getPageCounts } from '../../utils/pagination_helper';
import { useKibana } from '../../hooks/use_kibana';

export interface ResultListArgs {
  searchResults: SearchHit[];
  mappings?: IndicesGetMappingResponse;
  pagination: Pagination;
  onPaginationChange: (nextPage: number) => void;
  searchQuery?: string;
}

export const ResultList: React.FC<ResultListArgs> = ({
  searchResults,
  mappings,
  pagination,
  onPaginationChange,
  searchQuery = '',
}) => {
  const {
    services: { data },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | null>(null);
  useEffect(() => {
    data.dataViews.getDefaultDataView().then((d) => setDataView(d));
  }, [data]);
  const [flyoutDocId, setFlyoutDocId] = useState<string | undefined>(undefined);
  const { totalPage, page } = getPageCounts(pagination);
  const hit =
    flyoutDocId &&
    buildDataTableRecord(searchResults.find((item) => item._id === flyoutDocId) as EsHitRecord);
  return (
    <>
      <DocumentList
        dataTelemetryIdPrefix="result-list"
        docs={searchResults}
        docsPerPage={10}
        isLoading={false}
        mappings={mappings}
        meta={{
          ...pagination,
          pageIndex: page - 1,
          totalItemCount: searchResults.length,
        }}
        onPaginate={onPaginationChange}
        showScore
        compactCard={false}
        defaultVisibleFields={0}
        onDocumentClick={(searchHit: SearchHit) => setFlyoutDocId(searchHit._id)}
      />

      {flyoutDocId && dataView && hit && (
        <UnifiedDocViewerFlyout
          services={{}}
          onClose={() => setFlyoutDocId(undefined)}
          isEsqlQuery={false}
          columns={[]}
          hit={hit}
          dataView={dataView}
          onAddColumn={() => {}}
          onRemoveColumn={() => {}}
          setExpandedDoc={() => {}}
          flyoutType="overlay"
        />
      )}
    </>
  );
};
