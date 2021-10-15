/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CustomItemAction, EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../../data_panel';
import { CurationSuggestion } from '../../../../types';

export const IgnoredSuggestionsPanel: React.FC = () => {
  const ignoredSuggestions: CurationSuggestion[] = [];

  const allowSuggestion = (query: string) => alert(query);

  const actions: Array<CustomItemAction<CurationSuggestion>> = [
    {
      render: (item: CurationSuggestion) => {
        return (
          <EuiLink onClick={() => allowSuggestion(item.query)} color="primary">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestions.allowButtonLabel',
              {
                defaultMessage: 'Allow',
              }
            )}
          </EuiLink>
        );
      },
    },
  ];

  const columns: Array<EuiBasicTableColumn<CurationSuggestion>> = [
    {
      field: 'query',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.queryColumnName',
        {
          defaultMessage: 'Query',
        }
      ),
      sortable: true,
    },
    {
      actions,
    },
  ];

  return (
    <DataPanel
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.curations.ignoredSuggestionsPanel.title',
            {
              defaultMessage: 'Ignored queries',
            }
          )}
        </h2>
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
      <EuiBasicTable items={ignoredSuggestions} itemId="query" columns={columns} />
    </DataPanel>
  );
};
