/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
  EuiPopover,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Result } from '../../../../../shared/result/result';
import { resultMetaData } from '../../../../../shared/result/result_metadata';

import { DocumentsLogic } from '../../documents_logic';

export const DocumentList: React.FC = () => {
  const {
    docsPerPage,
    isLoading,
    meta,
    results,
    simplifiedMapping: mappings,
  } = useValues(DocumentsLogic);
  const { onPaginate, setDocsPerPage } = useActions(DocumentsLogic);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const resultToField = (result: SearchHit) => {
    if (mappings && result._source && !Array.isArray(result._source)) {
      if (typeof result._source === 'object') {
        return Object.entries(result._source).map(([key, value]) => {
          return {
            fieldName: key,
            fieldType: mappings[key]?.type ?? 'object',
            fieldValue: JSON.stringify(value, null, 2),
          };
        });
      }
    }
    return [];
  };

  const getIconType = (size: number) => {
    return size === docsPerPage ? 'check' : 'empty';
  };

  return (
    <>
      <EuiPagination
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationAriaLabel',
          { defaultMessage: 'Pagination for document list' }
        )}
        pageCount={meta.page.total_pages}
        activePage={meta.page.current}
        onPageClick={onPaginate}
      />
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <p>
          Showing <strong>{results.length}</strong> of <strong>{meta.page.total_results}</strong>.
          Search results maxed at 10.000 documents.
        </p>
      </EuiText>
      {isLoading && <EuiProgress size="xs" color="primary" />}
      <EuiSpacer size="m" />
      {results.map((result) => {
        return (
          <React.Fragment key={result._id}>
            <Result fields={resultToField(result)} metaData={resultMetaData(result)} />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiPagination
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationAriaLabel',
              { defaultMessage: 'Pagination for document list' }
            )}
            pageCount={meta.page.total_pages}
            activePage={meta.page.current}
            onPageClick={onPaginate}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.documents.documentList.docsPerPage',
              { defaultMessage: 'Document count per page dropdown' }
            )}
            button={
              <EuiButtonEmpty
                size="s"
                iconType="arrowDown"
                iconSide="right"
                onClick={() => {
                  setIsPopoverOpen(true);
                }}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.documents.documentList.pagination.itemsPerPage',
                  {
                    defaultMessage: 'Documents per page: {docPerPage}',
                    values: { docPerPage: docsPerPage },
                  }
                )}
              </EuiButtonEmpty>
            }
            isOpen={isPopoverOpen}
            closePopover={() => {
              setIsPopoverOpen(false);
            }}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem
                  key="10 rows"
                  icon={getIconType(10)}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    setDocsPerPage(10);
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
                    { defaultMessage: '{docCount} documents', values: { docCount: 10 } }
                  )}
                </EuiContextMenuItem>,

                <EuiContextMenuItem
                  key="25 rows"
                  icon={getIconType(25)}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    setDocsPerPage(25);
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
                    { defaultMessage: '{docCount} documents', values: { docCount: 25 } }
                  )}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="50 rows"
                  icon={getIconType(50)}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    setDocsPerPage(50);
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
                    { defaultMessage: '{docCount} documents', values: { docCount: 50 } }
                  )}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />
      {meta.page.total_results === 10000 && (
        <EuiCallOut size="s" title="Results are limited to 10.000 documents" iconType="search">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.documents.documentList.resultLimit',
              {
                defaultMessage:
                  'Only the first 10,000 results are available for paging. Please use the search bar to filter down your results.',
              }
            )}
          </p>
        </EuiCallOut>
      )}
    </>
  );
};
