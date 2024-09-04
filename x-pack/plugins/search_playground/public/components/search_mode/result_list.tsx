/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPagination,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { Pagination } from '../../types';
import { getPageCounts } from '../../utils/pagination_helper';
import { EmptyResults } from './empty_results';
import { useKibana } from '../../hooks/use_kibana';

export interface ResultListArgs {
  searchResults: SearchHit[];
  pagination: Pagination;
}

export const ResultList: React.FC<ResultListArgs> = ({ searchResults, pagination }) => {
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
    <EuiPanel grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        {searchResults.map((item, index) => {
          return (
            <>
              <EuiFlexItem
                key={item._id + '-' + index}
                onClick={() => setFlyoutDocId(item._id)}
                grow
              >
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem grow>
                    <EuiTitle size="xs">
                      <h2>{item._id}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow>
                    <EuiText size="s">
                      <p>{item._source?.title || item._id}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {index !== searchResults.length - 1 && <EuiHorizontalRule margin="m" />}
            </>
          );
        })}
        {searchResults.length !== 0 && (
          <EuiFlexItem>
            <EuiPagination pageCount={totalPage} activePage={page} onPageClick={(p) => {}} />
          </EuiFlexItem>
        )}
        {searchResults.length === 0 && (
          <EuiFlexItem>
            <EmptyResults />
          </EuiFlexItem>
        )}
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
      </EuiFlexGroup>
    </EuiPanel>
  );
};
