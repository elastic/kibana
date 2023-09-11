/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX,
  ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
} from '../../../../../common/constants';
import { Status } from '../../../../../common/types/api';
import { stripSearchPrefix } from '../../../../../common/utils/strip_search_prefix';

import { DEFAULT_META } from '../../../shared/constants';
import { KibanaLogic } from '../../../shared/kibana';

import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';

import { searchDocumentsApiLogic } from '../../api/search_documents/search_documents_api_logic';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from './components/access_control_index_selector/access_control_index_selector';
import { DocumentList } from './components/document_list/document_list';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import './documents.scss';

export const INDEX_DOCUMENTS_META_DEFAULT = {
  page: {
    current: 0,
    size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    total_pages: 0,
    total_results: 0,
  },
};

export const DEFAULT_PAGINATION = {
  pageIndex: INDEX_DOCUMENTS_META_DEFAULT.page.current,
  pageSize: INDEX_DOCUMENTS_META_DEFAULT.page.size,
  totalItemCount: INDEX_DOCUMENTS_META_DEFAULT.page.total_results,
};

export const SearchIndexDocuments: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod, hasDocumentLevelSecurityFeature } = useValues(IndexViewLogic);
  const { productFeatures } = useValues(KibanaLogic);

  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const indexToShow =
    selectedIndexType === 'content-index'
      ? indexName
      : stripSearchPrefix(indexName, CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX);
  const mappingLogic = mappingsWithPropsApiLogic(indexToShow);
  const documentLogic = searchDocumentsApiLogic(indexToShow);

  const { makeRequest: getDocuments } = useActions(documentLogic);
  const { makeRequest: getMappings } = useActions(mappingLogic);
  const { data, status } = useValues(documentLogic);
  const { data: mappingData, status: mappingStatus } = useValues(mappingLogic);

  const docs = data?.results?.hits.hits ?? [];

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [searchQuery, setSearchQuery] = useState('');

  const shouldShowAccessControlSwitcher =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;

  useEffect(() => {
    getDocuments({
      indexName: indexToShow,
      pagination,
      query: searchQuery,
    });
  }, [indexToShow, pagination, searchQuery]);

  useEffect(() => {
    setSearchQuery('');
    setPagination(DEFAULT_PAGINATION);
    getMappings({ indexName: indexToShow });
  }, [indexToShow]);

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem className="enterpriseSearchDocumentsHeader" grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.title', {
                    defaultMessage: 'Browse documents',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {shouldShowAccessControlSwitcher && (
              <EuiFlexItem grow={false}>
                <AccessControlIndexSelector
                  onChange={setSelectedIndexType}
                  valueOfSelected={selectedIndexType}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFieldSearch
                data-telemetry-id={`entSearchContent-${ingestionMethod}-documents-searchDocuments`}
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.documents.searchField.placeholder',
                  {
                    defaultMessage: 'Search documents in this index',
                  }
                )}
                isClearable
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(event.target.value)
                }
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {docs.length === 0 &&
            i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.noMappings', {
              defaultMessage: 'No documents found for index',
            })}
          {docs.length > 0 && (
            <DocumentList
              docs={docs}
              docsPerPage={pagination.pageSize}
              isLoading={status !== Status.SUCCESS && mappingStatus !== Status.SUCCESS}
              mappings={mappingData?.mappings?.properties ?? {}}
              meta={data?.meta ?? DEFAULT_META}
              onPaginate={(pageIndex) => setPagination({ ...pagination, pageIndex })}
              setDocsPerPage={(pageSize) => setPagination({ ...pagination, pageSize })}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
