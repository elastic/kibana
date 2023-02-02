/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiFieldText, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { clearFlashMessages, flashSuccessToast } from '../../../../../shared/flash_messages';
import { GenericEndpointInlineEditableTable } from '../../../../../shared/tables/generic_endpoint_inline_editable_table';

import { InlineEditableTableColumn } from '../../../../../shared/tables/inline_editable_table/types';
import { ItemWithAnID } from '../../../../../shared/tables/types';
import { CrawlerDomain, Sitemap } from '../../../../api/crawler/types';

import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';

const ADD_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.crawler.sitemapsTable.addButtonLabel',
  { defaultMessage: 'Add sitemap' }
);

interface SitemapsTableProps {
  domain: CrawlerDomain;
  indexName: string;
  items: Sitemap[];
}

export const SitemapsTable: React.FC<SitemapsTableProps> = ({ domain, indexName, items }) => {
  const { updateSitemaps } = useActions(CrawlerDomainDetailLogic);
  const field = 'url';

  const columns: Array<InlineEditableTableColumn<ItemWithAnID>> = [
    {
      editingRender: (sitemap, onChange, { isInvalid, isLoading }) => (
        <EuiFieldText
          data-telemetry-id="entSearchContent-crawler-domainDetail-siteMaps-editSitemap"
          fullWidth
          value={(sitemap as Sitemap)[field]}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
        />
      ),
      render: (sitemap) => <EuiText size="s">{(sitemap as Sitemap)[field]}</EuiText>,
      name: i18n.translate('xpack.enterpriseSearch.crawler.sitemapsTable.urlTableHead', {
        defaultMessage: 'URL',
      }),
      field,
    },
  ];

  const sitemapsRoute = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domain.id}/sitemaps`;
  const getSitemapRoute = (sitemap: Sitemap) =>
    `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domain.id}/sitemaps/${sitemap.id}`;

  return (
    <GenericEndpointInlineEditableTable
      addButtonText={ADD_BUTTON_LABEL}
      columns={columns}
      description={
        <p>
          {i18n.translate('xpack.enterpriseSearch.crawler.sitemapsTable.description', {
            defaultMessage: 'Specify sitemap URLs for the crawler on this domain.',
          })}
        </p>
      }
      instanceId="SitemapsTable"
      items={items}
      canRemoveLastItem
      noItemsMessage={(editNewItem) => (
        <>
          <EuiEmptyPrompt
            title={
              <h4>
                {i18n.translate('xpack.enterpriseSearch.crawler.sitemapsTable.emptyMessageTitle', {
                  defaultMessage: 'There are no existing sitemaps.',
                })}
              </h4>
            }
            titleSize="s"
            body={<EuiText>Add a sitemap to specify an entry point for the crawler.</EuiText>}
            actions={<EuiButton onClick={editNewItem}>{ADD_BUTTON_LABEL}</EuiButton>}
          />
        </>
      )}
      addRoute={sitemapsRoute}
      deleteRoute={getSitemapRoute}
      updateRoute={getSitemapRoute}
      dataProperty="sitemaps"
      onAdd={(_, newSitemaps) => {
        updateSitemaps(newSitemaps as Sitemap[]);
        clearFlashMessages();
      }}
      onDelete={(_, newSitemaps) => {
        updateSitemaps(newSitemaps as Sitemap[]);
        clearFlashMessages();
        flashSuccessToast(
          i18n.translate('xpack.enterpriseSearch.crawler.sitemapsTable.deleteSuccessToastMessage', {
            defaultMessage: 'The sitemap has been deleted.',
          })
        );
      }}
      onUpdate={(_, newSitemaps) => {
        updateSitemaps(newSitemaps as Sitemap[]);
        clearFlashMessages();
      }}
      title={i18n.translate('xpack.enterpriseSearch.crawler.sitemapsTable.title', {
        defaultMessage: 'Sitemaps',
      })}
      disableReordering
    />
  );
};
