/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';

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

import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { Meta } from '../../../../../../../common/types';

import { Result } from '../../../../../shared/result/result';
import { resultMetaData } from '../../../../../shared/result/result_metadata';

import { IndexViewLogic } from '../../index_view_logic';

interface DocumentListProps {
  docs: SearchHit[];
  docsPerPage: number;
  isLoading: boolean;
  mappings: Record<string, MappingProperty> | undefined;
  meta: Meta;
  onPaginate: (newPageIndex: number) => void;
  setDocsPerPage: (docsPerPage: number) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  docs,
  docsPerPage,
  isLoading,
  mappings,
  meta,
  onPaginate,
  setDocsPerPage,
}) => {
  const { ingestionMethod } = useValues(IndexViewLogic);

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
          <FormattedMessage
            id="xpack.enterpriseSearch.content.searchIndex.documents.documentList.description"
            defaultMessage="Showing {results} of {total}.
            Search results maxed at {maximum} documents."
            values={{
              maximum: <FormattedNumber value={10000} />,
              results: (
                <strong>
                  <FormattedNumber value={docs.length} />
                </strong>
              ),
              total: (
                <strong>
                  <FormattedNumber value={meta.page.total_results} />
                </strong>
              ),
            }}
          />
        </p>
      </EuiText>
      {isLoading && <EuiProgress size="xs" color="primary" />}
      <EuiSpacer size="m" />
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result fields={resultToField(doc)} metaData={resultMetaData(doc)} />
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
                data-telemetry-id={`entSearchContent-${ingestionMethod}-documents-docsPerPage`}
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
      {meta.page.total_results > 9999 && (
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.enterpriseSearch.content.searchIndex.documents.documentList.resultLimitTitle"
              defaultMessage="Results are limited to {number} documents"
              values={{
                number: <FormattedNumber value={10000} />,
              }}
            />
          }
          iconType="search"
        >
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.content.searchIndex.documents.documentList.resultLimit"
              defaultMessage="Only the first {number} results are available for paging. Please use the search bar to filter down your results."
              values={{
                number: <FormattedNumber value={10000} />,
              }}
            />
          </p>
        </EuiCallOut>
      )}
    </>
  );
};
