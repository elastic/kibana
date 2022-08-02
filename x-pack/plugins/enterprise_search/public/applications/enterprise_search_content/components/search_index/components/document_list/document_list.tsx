/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions } from 'kea';

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Meta } from '../../../../../../../common/types';
import { Result } from '../../../../../shared/result/result';
import { DocumentsLogic } from '../../documents_logic';

import type { DocumentsLogicValues } from '../../documents_logic';

interface DocumentListProps {
  mappings: DocumentsLogicValues['simplifiedMapping'];
  meta: Meta;
  results: DocumentsLogicValues['results'];
}

export const DocumentList: React.FC<DocumentListProps> = ({ mappings, results, meta }) => {
  const { onPaginate } = useActions(DocumentsLogic);
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

  const docsPerPageButton = (
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
        { defaultMessage: 'Documents per page: {docPerPage}', values: { docPerPage: '50' } }
      )}
    </EuiButtonEmpty>
  );

  const getIconType = (size: number) => {
    return size === meta.page.size ? 'check' : 'empty';
  };

  const docsPerPageOptions = [
    <EuiContextMenuItem
      key="20 rows"
      icon={getIconType(20)}
      onClick={() => setIsPopoverOpen(false)}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
        { defaultMessage: '{docCount} documents', values: { docCount: 20 } }
      )}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="50 rows"
      icon={getIconType(50)}
      onClick={() => setIsPopoverOpen(false)}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
        { defaultMessage: '{docCount} documents', values: { docCount: 50 } }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="100 rows"
      icon={getIconType(100)}
      onClick={() => setIsPopoverOpen(false)}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.documentList.paginationOptions.option',
        { defaultMessage: '{docCount} documents', values: { docCount: 100 } }
      )}
    </EuiContextMenuItem>,
  ];

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
      {results.map((result) => {
        return (
          <>
            <Result
              fields={resultToField(result)}
              metaData={{
                id: result._id,
              }}
            />
            <EuiSpacer size="s" />
          </>
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
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={docsPerPageButton}
            isOpen={isPopoverOpen}
            closePopover={() => {
              setIsPopoverOpen(false);
            }}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={docsPerPageOptions} />
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
