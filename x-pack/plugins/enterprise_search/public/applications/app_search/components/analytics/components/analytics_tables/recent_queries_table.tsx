/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedDateTime } from '../../../../utils/formatted_date_time';
import { RecentQuery } from '../../types';

import {
  TERM_COLUMN_PROPS,
  TAGS_LIST_COLUMN,
  COUNT_COLUMN_PROPS,
  ACTIONS_COLUMN,
} from './shared_columns';

interface Props {
  items: RecentQuery[];
}
type Columns = Array<EuiBasicTableColumn<RecentQuery>>;

export const RecentQueriesTable: React.FC<Props> = ({ items }) => {
  const TERM_COLUMN = {
    ...TERM_COLUMN_PROPS,
    field: 'query_string',
  };

  const TIME_COLUMN = {
    field: 'timestamp',
    name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.timeColumn', {
      defaultMessage: 'Time',
    }),
    render: (timestamp: RecentQuery['timestamp']) => (
      <FormattedDateTime date={new Date(timestamp)} />
    ),
    width: '200px',
  };

  const RESULTS_COLUMN = {
    ...COUNT_COLUMN_PROPS,
    field: 'document_ids',
    name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.resultsColumn', {
      defaultMessage: 'Results',
    }),
    render: (documents: RecentQuery['document_ids']) => documents.length,
  };

  return (
    <EuiBasicTable
      columns={
        [TERM_COLUMN, TIME_COLUMN, TAGS_LIST_COLUMN, RESULTS_COLUMN, ACTIONS_COLUMN] as Columns
      }
      items={items}
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="visLine"
          title={
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noRecentQueriesTitle',
                { defaultMessage: 'No recent queries' }
              )}
            </h4>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noRecentQueriesDescription',
            { defaultMessage: 'Queries will appear here as they are received.' }
          )}
        />
      }
    />
  );
};
