/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime } from '@kbn/i18n/react';
import { EuiBasicTable, EuiBasicTableColumn, EuiEmptyPrompt } from '@elastic/eui';

import { RecentQuery } from '../../types';
import {
  TERM_COLUMN_PROPS,
  TAGS_COLUMN,
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
    render: (timestamp: RecentQuery['timestamp']) => {
      const date = new Date(timestamp);
      return (
        <>
          <FormattedDate value={date} /> <FormattedTime value={date} />
        </>
      );
    },
    width: '175px',
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
      columns={[TERM_COLUMN, TIME_COLUMN, TAGS_COLUMN, RESULTS_COLUMN, ACTIONS_COLUMN] as Columns}
      items={items}
      responsive
      hasActions
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
