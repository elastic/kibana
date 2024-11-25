/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { DocumentList, pageToPagination } from '@kbn/search-index-documents';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { IndicesGetMappingResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { Pagination as PaginationTypeEui } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { Pagination } from '../../types';

export interface ResultListArgs {
  searchResults: SearchHit[];
  mappings?: IndicesGetMappingResponse;
  pagination: Pagination;
  onPaginationChange: (nextPage: number) => void;
}

export const ResultList: React.FC<ResultListArgs> = ({
  searchResults,
  mappings,
  pagination,
  onPaginationChange,
}) => {
  const {
    services: { data },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | null>(null);
  useEffect(() => {
    data.dataViews.getDefaultDataView().then((d) => setDataView(d));
  }, [data]);
  const [flyoutDocId, setFlyoutDocId] = useState<string | undefined>(undefined);
  const documentMeta: PaginationTypeEui = pageToPagination(pagination);
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
        meta={documentMeta}
        onPaginate={onPaginationChange}
        onDocumentClick={(searchHit: SearchHit) => setFlyoutDocId(searchHit._id)}
        resultProps={{
          showScore: true,
          compactCard: false,
          defaultVisibleFields: 0,
        }}
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
