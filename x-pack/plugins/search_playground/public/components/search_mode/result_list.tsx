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
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { Pagination } from '../../types';
import { getPageCounts } from '../../utils/pagination_helper';
import { EmptyResults } from './empty_results';
import { useKibana } from '../../hooks/use_kibana';

export interface ResultListArgs {
  searchResults: SearchHit[];
  pagination: Pagination;
  onPaginationChange: (nextPage: number) => void;
  searchQuery?: string;
}

export const ResultList: React.FC<ResultListArgs> = ({
  searchResults,
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
    <EuiPanel grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        {searchResults.length === 0 && (
          <EuiFlexItem>
            <EmptyResults query={searchQuery} />
          </EuiFlexItem>
        )}
        {searchResults.length !== 0 &&
          searchResults.map((item, index) => {
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
                        <h3>ID:{item._id}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiText size="s">
                        <p>
                          {i18n.translate('xpack.searchPlayground.resultList.result.score', {
                            defaultMessage: 'Document score: {score}',
                            values: { score: item._score },
                          })}
                        </p>
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
            <EuiPagination
              pageCount={totalPage}
              activePage={page}
              onPageClick={onPaginationChange}
            />
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
