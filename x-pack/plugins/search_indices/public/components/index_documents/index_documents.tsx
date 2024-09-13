/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Result, resultToField, resultMetaData } from '@kbn/search-index-documents';

import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { useIndexDocumentSearch } from '../../hooks/api/use_document_search';
import { useIndexMapping } from '../../hooks/api/use_index_mappings';
import { useKibana } from '../../hooks/use_kibana';
import { AddDocumentsCodeExample } from './add_documents_code_example';

interface IndexDocumentsProps {
  indexName: string;
}

interface RecentDocsActionMessageProps {
  indexName: string;
}

const DEFAULT_PAGE_SIZE = 50;

const RecentDocsActionMessage: React.FC<RecentDocsActionMessageProps> = ({ indexName }) => {
  const {
    services: { share },
  } = useKibana();

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const onClick = async () => {
    await discoverLocator?.navigate({ dataViewSpec: { title: indexName } });
  };

  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="subdued" borderRadius="none">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon type="calendar" />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>
            {i18n.translate(
              'xpack.serverlessSearch.indexManagementTab.documents.recentDocsActionMessage',
              {
                defaultMessage:
                  'You are viewing the {pageSize} most recently ingested documents in this index. To see all documents, view in {discoverLink}.',
                values: {
                  pageSize: DEFAULT_PAGE_SIZE,
                  discoverLink: (
                    <EuiLink onClick={onClick}>
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagementTab.documents.recentDocsActionMessage.discoverLink',
                        {
                          defaultMessage: 'Discover',
                        }
                      )}
                    </EuiLink>
                  ),
                },
              }
            )}
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

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
          {docs.length === 0 && <AddDocumentsCodeExample />}
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
