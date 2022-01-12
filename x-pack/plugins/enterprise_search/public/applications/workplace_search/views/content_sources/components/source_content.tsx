/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../shared/doc_links';
import { TruncatedContent } from '../../../../shared/truncate';
import { ComponentLoader } from '../../../components/shared/component_loader';
import { TablePaginationBar } from '../../../components/shared/table_pagination_bar';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { NAV, CUSTOM_SERVICE_TYPE } from '../../../constants';
import { SourceContentItem } from '../../../types';
import {
  NO_CONTENT_MESSAGE,
  CUSTOM_DOCUMENTATION_LINK,
  TITLE_HEADING,
  LAST_UPDATED_HEADING,
  GO_BUTTON,
  RESET_BUTTON,
  SOURCE_CONTENT_TITLE,
  SEARCH_CONTENT_PLACEHOLDER,
  FILTER_CONTENT_PLACEHOLDER,
  CONTENT_LOADING_TEXT,
} from '../constants';
import { SourceLogic } from '../source_logic';

import { SourceLayout } from './source_layout';

const MAX_LENGTH = 28;

export const SourceContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { setActivePage, searchContentSourceDocuments, setContentFilterValue } =
    useActions(SourceLogic);

  const {
    contentSource: { id, serviceType, urlField, titleField, urlFieldIsLinkable, isFederatedSource },
    contentMeta: {
      page: { total_pages: totalPages, total_results: totalItems, current: activePage },
    },
    contentItems,
    contentFilterValue,
    sectionLoading,
  } = useValues(SourceLogic);

  useEffect(() => {
    searchContentSourceDocuments(id);
  }, [contentFilterValue, activePage]);

  const showPagination = totalPages > 1;
  const hasItems = totalItems > 0;
  const emptyMessage = contentFilterValue
    ? i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.noContentForValue.message', {
        defaultMessage: "No results for '{contentFilterValue}'",
        values: { contentFilterValue },
      })
    : NO_CONTENT_MESSAGE;

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
    <EuiPanel hasShadow={false} color="subdued">
      <EuiEmptyPrompt
        title={<h2>{emptyMessage}</h2>}
        iconType="documents"
        body={
          isCustomSource ? (
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.sources.customSourceDocs.text"
                defaultMessage="Learn more about adding content in our {documentationLink}"
                values={{
                  documentationLink: (
                    <EuiLink target="_blank" href={docLinks.workplaceSearchCustomSources}>
                      {CUSTOM_DOCUMENTATION_LINK}
                    </EuiLink>
                  ),
                }}
              />
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
            <EuiLink target="_blank" href={url.toString()}>
              <TruncatedContent tooltipType="title" content={url.toString()} length={MAX_LENGTH} />
            </EuiLink>
          )}
        </EuiTableRowCell>
        <EuiTableRowCell align="right">
          {moment(updated).format('M/D/YYYY, h:mm:ss A')}
        </EuiTableRowCell>
      </EuiTableRow>
    );
  };

  const contentTable = (
    <>
      {showPagination && <TablePaginationBar {...paginationOptions} />}
      <EuiSpacer size="m" />
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>{TITLE_HEADING}</EuiTableHeaderCell>
          <EuiTableHeaderCell>{startCase(urlField)}</EuiTableHeaderCell>
          <EuiTableHeaderCell align="right">{LAST_UPDATED_HEADING}</EuiTableHeaderCell>
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
          {GO_BUTTON}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty disabled={!searchTerm} onClick={resetFederatedSearchTerm}>
          {RESET_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );

  return (
    <SourceLayout pageChrome={[NAV.CONTENT]} pageViewTelemetry="source_overview">
      <ViewContentHeader title={SOURCE_CONTENT_TITLE} />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            disabled={!hasItems && !contentFilterValue}
            placeholder={
              isFederatedSource ? SEARCH_CONTENT_PLACEHOLDER : FILTER_CONTENT_PLACEHOLDER
            }
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
      {sectionLoading && <ComponentLoader text={CONTENT_LOADING_TEXT} />}
      {!sectionLoading && (hasItems ? contentTable : emptyState)}
    </SourceLayout>
  );
};
