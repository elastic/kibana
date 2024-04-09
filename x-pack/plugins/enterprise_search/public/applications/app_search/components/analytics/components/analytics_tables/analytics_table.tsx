/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Query } from '../../types';

import {
  TERM_COLUMN_PROPS,
  TAGS_LIST_COLUMN,
  TAGS_COUNT_COLUMN,
  COUNT_COLUMN_PROPS,
  ACTIONS_COLUMN,
} from './shared_columns';

interface Props {
  items: Query[];
  hasClicks?: boolean;
  isSmall?: boolean;
}
type Columns = Array<EuiBasicTableColumn<Query>>;

export const AnalyticsTable: React.FC<Props> = ({ items, hasClicks, isSmall }) => {
  const TERM_COLUMN = {
    field: 'key',
    ...TERM_COLUMN_PROPS,
  };

  const TAGS_COLUMN = isSmall ? TAGS_COUNT_COLUMN : TAGS_LIST_COLUMN;

  const COUNT_COLUMNS = [
    {
      field: 'searches.doc_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.analytics.table.queriesColumn',
        { defaultMessage: 'Queries' }
      ),
      ...COUNT_COLUMN_PROPS,
    },
  ];
  if (hasClicks) {
    COUNT_COLUMNS.push({
      field: 'clicks.doc_count',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.clicksColumn', {
        defaultMessage: 'Clicks',
      }),
      ...COUNT_COLUMN_PROPS,
    });
  }

  return (
    <EuiBasicTable
      columns={[TERM_COLUMN, TAGS_COLUMN, ...COUNT_COLUMNS, ACTIONS_COLUMN] as Columns}
      items={items}
      hasActions
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="visLine"
          title={
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noQueriesTitle',
                { defaultMessage: 'No queries to display' }
              )}
            </h4>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noQueriesDescription',
            { defaultMessage: 'No queries were performed during this time period.' }
          )}
        />
      }
    />
  );
};
