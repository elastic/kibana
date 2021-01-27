/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';
import { startCase } from 'lodash';
import moment from 'moment';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiLink,
} from '@elastic/eui';

import { CUSTOM_SOURCE_DOCS_URL } from '../../../routes';
import { SourceContentItem } from '../../../types';

import { TruncatedContent } from '../../../../shared/truncate';

const MAX_LENGTH = 28;

import { ComponentLoader } from '../../../components/shared/component_loader';
import { Loading } from '../../../../../applications/shared/loading';
import { TablePaginationBar } from '../../../components/shared/table_pagination_bar';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { CUSTOM_SERVICE_TYPE } from '../../../constants';

import { SourceLogic } from '../source_logic';

export const SourceContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    setActivePage,
    searchContentSourceDocuments,
    resetSourceState,
    setContentFilterValue,
  } = useActions(SourceLogic);

  const {
    contentSource: { id, serviceType, urlField, titleField, urlFieldIsLinkable, isFederatedSource },
    contentMeta: {
      page: { total_pages: totalPages, total_results: totalItems, current: activePage },
    },
    contentItems,
    contentFilterValue,
    dataLoading,
    sectionLoading,
  } = useValues(SourceLogic);

  useEffect(() => {
    return resetSourceState;
  }, []);

  useEffect(() => {
    searchContentSourceDocuments(id);
  }, [contentFilterValue, activePage]);

  if (dataLoading) return <Loading />;

  const showPagination = totalPages > 1;
  const hasItems = totalItems > 0;
  const emptyMessage = contentFilterValue
    ? `No results for '${contentFilterValue}'`
    : "This source doesn't have any content yet";

  const paginationOptions = {
    totalPages,
    totalItems,
    activePage,
    onChangePage: (page: number) => {
      // EUI component starts page at 0. API starts at 1.
      setActivePage(page + 1);
    },
  };

  const isCustomSource = serviceType === CUSTOM_SERVICE_TYPE;

  const emptyState = (
    <EuiPanel className="euiPanel--inset">
      <EuiEmptyPrompt
        title={<h2>{emptyMessage}</h2>}
        iconType="documents"
        body={
          isCustomSource ? (
            <p>
              Learn more about adding content in our{' '}
              <EuiLink target="_blank" href={CUSTOM_SOURCE_DOCS_URL}>
                documentation
              </EuiLink>
            </p>
          ) : null
        }
      />
    </EuiPanel>
  );

  const contentItem = (item: SourceContentItem) => {
    const { id: itemId, last_updated: updated } = item;
    const url = item[urlField] || '';
    const title = item[titleField] || '';

    return (
      <EuiTableRow key={itemId} data-test-subj="ContentItemRow">
        <EuiTableRowCell className="eui-textTruncate">
          <TruncatedContent tooltipType="title" content={title.toString()} length={MAX_LENGTH} />
        </EuiTableRowCell>
        <EuiTableRowCell className="eui-textTruncate" data-test-subj="URLFieldCell">
          {!urlFieldIsLinkable && (
            <TruncatedContent tooltipType="title" content={url.toString()} length={MAX_LENGTH} />
          )}
          {urlFieldIsLinkable && (
            <EuiLink target="_blank" href={url}>
              <TruncatedContent tooltipType="title" content={url.toString()} length={MAX_LENGTH} />
            </EuiLink>
          )}
        </EuiTableRowCell>
        <EuiTableRowCell>{moment(updated).format('M/D/YYYY, h:mm:ss A')}</EuiTableRowCell>
      </EuiTableRow>
    );
  };

  const contentTable = (
    <>
      {showPagination && <TablePaginationBar {...paginationOptions} />}
      <EuiSpacer size="m" />
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>Title</EuiTableHeaderCell>
          <EuiTableHeaderCell>{startCase(urlField)}</EuiTableHeaderCell>
          <EuiTableHeaderCell>Last Updated</EuiTableHeaderCell>
        </EuiTableHeader>
        <EuiTableBody>{contentItems.map(contentItem)}</EuiTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      {showPagination && <TablePaginationBar {...paginationOptions} hideLabelCount />}
    </>
  );

  const resetFederatedSearchTerm = () => {
    setContentFilterValue('');
    setSearchTerm('');
  };
  const federatedSearchControls = (
    <>
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={!searchTerm}
          fill
          color="primary"
          onClick={() => setContentFilterValue(searchTerm)}
        >
          Go
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty disabled={!searchTerm} onClick={resetFederatedSearchTerm}>
          Reset
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );

  return (
    <>
      <ViewContentHeader title="Source content" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            disabled={!hasItems && !contentFilterValue}
            placeholder={`${isFederatedSource ? 'Search' : 'Filter'} content...`}
            incremental={!isFederatedSource}
            isClearable={!isFederatedSource}
            onSearch={setContentFilterValue}
            data-test-subj="ContentFilterInput"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </EuiFlexItem>
        {isFederatedSource && federatedSearchControls}
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      {sectionLoading && <ComponentLoader text="Loading content..." />}
      {!sectionLoading && (hasItems ? contentTable : emptyState)}
    </>
  );
};
