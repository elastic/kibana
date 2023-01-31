/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFieldText, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';
import { GenericEndpointInlineEditableTable } from '../../../../../shared/tables/generic_endpoint_inline_editable_table';

import { InlineEditableTableColumn } from '../../../../../shared/tables/inline_editable_table/types';
import { ItemWithAnID } from '../../../../../shared/tables/types';
import { CrawlerDomain, EntryPoint } from '../../../../api/crawler/types';

import { EntryPointsTableLogic } from './entry_points_table_logic';

export interface EntryPointsTableProps {
  domain: CrawlerDomain;
  indexName: string;
  items: EntryPoint[];
}

export const EntryPointsTable: React.FC<EntryPointsTableProps> = ({ domain, indexName, items }) => {
  const { onAdd, onDelete, onUpdate } = useActions(EntryPointsTableLogic);
  const field = 'value';

  const columns: Array<InlineEditableTableColumn<ItemWithAnID>> = [
    {
      editingRender: (entryPoint, onChange, { isInvalid, isLoading }) => (
        <EuiFieldText
          data-telemetry-id="entSearchContent-crawler-domainDetail-entryPoints-editEntryPoint"
          fullWidth
          value={(entryPoint as EntryPoint)[field]}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
          prepend={domain.url}
        />
      ),
      render: (entryPoint) => (
        <EuiText size="s">
          {domain.url}
          {(entryPoint as EntryPoint)[field]}
        </EuiText>
      ),
      name: i18n.translate('xpack.enterpriseSearch.crawler.entryPointsTable.urlTableHead', {
        defaultMessage: 'URL',
      }),
      field,
    },
  ];

  const entryPointsRoute = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domain.id}/entry_points`;

  const getEntryPointRoute = (entryPoint: EntryPoint) =>
    `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domain.id}/entry_points/${entryPoint.id}`;

  return (
    <GenericEndpointInlineEditableTable
      addButtonText={i18n.translate(
        'xpack.enterpriseSearch.crawler.entryPointsTable.addButtonLabel',
        { defaultMessage: 'Add entry point' }
      )}
      columns={columns}
      description={
        <p>
          {i18n.translate('xpack.enterpriseSearch.crawler.entryPointsTable.description', {
            defaultMessage:
              'Include the most important URLs for your website here. Entry point URLs will be the first pages to be indexed and processed for links to other pages.',
          })}{' '}
          <EuiLink href={docLinks.crawlerManaging} target="_blank" external>
            {i18n.translate('xpack.enterpriseSearch.crawler.entryPointsTable.learnMoreLinkText', {
              defaultMessage: 'Learn more about entry points.',
            })}
          </EuiLink>
        </p>
      }
      instanceId="EntryPointsTable"
      items={items}
      lastItemWarning={i18n.translate(
        'xpack.enterpriseSearch.crawler.entryPointsTable.lastItemMessage',
        { defaultMessage: 'The crawler requires at least one entry point.' }
      )}
      // Since canRemoveLastItem is false, the only time noItemsMessage would be displayed is if the last entry point was deleted via the API.
      noItemsMessage={(editNewItem) => (
        <>
          <EuiSpacer />
          <EuiTitle size="m">
            <h4>
              {i18n.translate('xpack.enterpriseSearch.crawler.entryPointsTable.emptyMessageTitle', {
                defaultMessage: 'There are no existing entry points.',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.enterpriseSearch.crawler.entryPointsTable.emptyMessageDescription"
              defaultMessage="{link} to specify an entry point
              for the crawler"
              values={{
                link: (
                  <EuiLink onClick={editNewItem}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.crawler.entryPointsTable.emptyMessageLinkText',
                      { defaultMessage: 'Add an entry point' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
          <EuiSpacer />
        </>
      )}
      addRoute={entryPointsRoute}
      canRemoveLastItem={false}
      deleteRoute={getEntryPointRoute}
      updateRoute={getEntryPointRoute}
      dataProperty="entry_points"
      onAdd={onAdd}
      onDelete={onDelete}
      onUpdate={onUpdate}
      title={i18n.translate('xpack.enterpriseSearch.crawler.entryPointsTable.title', {
        defaultMessage: 'Entry points',
      })}
      disableReordering
    />
  );
};
