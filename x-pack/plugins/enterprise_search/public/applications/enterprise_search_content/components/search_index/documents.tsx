/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '@kbn/search-connectors';

import {
  DocumentList,
  DocumentsOverview,
  INDEX_DOCUMENTS_META_DEFAULT,
} from '@kbn/search-index-documents';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';

import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';
import { searchDocumentsApiLogic } from '../../api/search_documents/search_documents_api_logic';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from './components/access_control_index_selector/access_control_index_selector';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

const DEFAULT_PAGINATION = {
  pageIndex: INDEX_DOCUMENTS_META_DEFAULT.pageIndex,
  pageSize: INDEX_DOCUMENTS_META_DEFAULT.pageSize,
  totalItemCount: INDEX_DOCUMENTS_META_DEFAULT.totalItemCount,
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
      : `${CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX}${indexName}`;
  const mappingLogic = mappingsWithPropsApiLogic(indexToShow);
  const documentLogic = searchDocumentsApiLogic(indexToShow);
  const { makeRequest: getDocuments } = useActions(documentLogic);
  const { makeRequest: getMappings } = useActions(mappingLogic);
  const { data, status, error } = useValues(documentLogic);
  const { data: mappingData, status: mappingStatus } = useValues(mappingLogic);

  const docs = data?.results ?? [];

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryCallback = (searchQ: string) => {
    setSearchQuery(searchQ);
  };
  const shouldShowAccessControlSwitcher =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;

  const isAccessControlIndexNotFound =
    shouldShowAccessControlSwitcher && error?.body?.statusCode === 404;
  useEffect(() => {
    getDocuments({
      indexName: indexToShow,
      pagination: {
        ...pagination,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize ?? 10,
      },
      query: searchQuery,
    });
  }, [indexToShow, pagination, searchQuery]);

  useEffect(() => {
    setSearchQuery('');
    setPagination(DEFAULT_PAGINATION);
    getMappings({ indexName: indexToShow });
  }, [indexToShow]);
  return (
    <DocumentsOverview
      dataTelemetryIdPrefix={`entSearchContent-${ingestionMethod}`}
      searchQueryCallback={searchQueryCallback}
      documentComponent={
        <>
          {isAccessControlIndexNotFound && (
            <EuiCallOut
              size="m"
              title={i18n.translate(
                'xpack.enterpriseSearch.content.searchIndex.documents.noIndex.title',
                { defaultMessage: 'Access Control Index not found' }
              )}
              iconType="iInCircle"
            >
              <p>
                {i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.noIndex', {
                  defaultMessage:
                    "An Access Control Index won't be created until you enable document-level security and run your first access control sync.",
                })}
              </p>
            </EuiCallOut>
          )}
          {!isAccessControlIndexNotFound &&
            docs.length === 0 &&
            i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.noMappings', {
              defaultMessage: 'No documents found for index',
            })}
          {!isAccessControlIndexNotFound && docs.length > 0 && (
            <DocumentList
              dataTelemetryIdPrefix={`entSearchContent-${ingestionMethod}`}
              docs={docs}
              docsPerPage={pagination.pageSize ?? 10}
              isLoading={status !== Status.SUCCESS && mappingStatus !== Status.SUCCESS}
              mappings={mappingData?.mappings?.properties ?? {}}
              meta={data?.meta ?? DEFAULT_PAGINATION}
              onPaginate={(pageIndex) => setPagination({ ...pagination, pageIndex })}
              setDocsPerPage={(pageSize) => setPagination({ ...pagination, pageSize })}
            />
          )}
        </>
      }
      accessControlSwitch={
        shouldShowAccessControlSwitcher ? (
          <AccessControlIndexSelector
            onChange={setSelectedIndexType}
            valueOfSelected={selectedIndexType}
          />
        ) : undefined
      }
    />
  );
};
