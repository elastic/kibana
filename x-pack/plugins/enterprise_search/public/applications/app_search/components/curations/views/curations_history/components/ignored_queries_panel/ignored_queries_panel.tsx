/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  convertMetaToPagination,
  handlePageChange,
} from '../../../../../../../shared/table_pagination';

import { DataPanel } from '../../../../../data_panel';

import { IgnoredQueriesLogic } from './ignored_queries_logic';

export const IgnoredQueriesPanel: React.FC = () => {
  const { dataLoading, ignoredQueries, meta } = useValues(IgnoredQueriesLogic);
  const { allowIgnoredQuery, loadIgnoredQueries, onPaginate } = useActions(IgnoredQueriesLogic);

  useEffect(() => {
    loadIgnoredQueries();
  }, [meta.page.current]);

  const columns: Array<EuiBasicTableColumn<string>> = [
    {
      render: (query: string) => query,
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.queryColumnName',
        {
          defaultMessage: 'Query',
        }
      ),
    },
    {
      actions: [
        {
          type: 'button',
          name: i18n.translate(
            'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestions.allowButtonLabel',
            {
              defaultMessage: 'Allow',
            }
          ),
          description: i18n.translate(
            'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestions.allowButtonDescription',
            {
              defaultMessage: 'Enable suggestions for this query',
            }
          ),
          onClick: (query) => allowIgnoredQuery(query),
          color: 'primary',
        },
      ],
    },
  ];

  return (
    <DataPanel
      isLoading={dataLoading}
      title={
        <EuiFlexGroup>
          <EuiFlexItem component="h2">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.title',
              {
                defaultMessage: 'Ignored queries',
              }
            )}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiButtonEmpty iconType="refresh" size="xs" onClick={() => loadIgnoredQueries()}>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.refresh',
                {
                  defaultMessage: 'Refresh',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      subtitle={
        <span>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.description',
            {
              defaultMessage: 'You won’t be notified about suggestions for these queries',
            }
          )}
        </span>
      }
      iconType="eyeClosed"
      hasBorder
    >
      <EuiBasicTable
        items={ignoredQueries}
        itemId="query"
        columns={columns}
        hasActions
        pagination={{
          ...convertMetaToPagination(meta),
          showPerPageOptions: false,
        }}
        onChange={handlePageChange(onPaginate)}
      />
    </DataPanel>
  );
};
