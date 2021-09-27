/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VIEW_BUTTON_LABEL } from '../../../../shared/constants';
import { LightbulbIcon } from '../../../../shared/icons';
import { KibanaLogic } from '../../../../shared/kibana';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';
import { ENGINE_CURATION_SUGGESTION_PATH } from '../../../routes';
import { FormattedDateTime } from '../../../utils/formatted_date_time';
import { DataPanel } from '../../data_panel';
import { generateEnginePath } from '../../engine';
import { CurationSuggestion } from '../types';
import { convertToDate } from '../utils';

const getSuggestionRoute = (query: string) => {
  return generateEnginePath(ENGINE_CURATION_SUGGESTION_PATH, { query });
};

const columns: Array<EuiBasicTableColumn<CurationSuggestion>> = [
  {
    field: 'query',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.column.queryTableHeader',
      { defaultMessage: 'Query' }
    ),
    render: (query: string) => <EuiLinkTo to={getSuggestionRoute(query)}>{query}</EuiLinkTo>,
  },
  {
    field: 'updated_at',
    dataType: 'string',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.column.lastUpdatedTableHeader',
      { defaultMessage: 'Last updated' }
    ),
    render: (dateString: string) => <FormattedDateTime date={convertToDate(dateString)} />,
  },
  {
    field: 'promoted',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.column.promotedDocumentsTableHeader',
      { defaultMessage: 'Promoted documents' }
    ),
    render: (promoted: string[]) => <span>{promoted.length}</span>,
  },
  {
    actions: [
      {
        name: VIEW_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.viewTooltip',
          { defaultMessage: 'View suggestion' }
        ),
        type: 'icon',
        icon: 'eye',
        onClick: (item) => {
          const { navigateToUrl } = KibanaLogic.values;
          const query = item.query;
          navigateToUrl(getSuggestionRoute(query));
        },
      },
    ],
    width: '120px',
  },
];

export const SuggestionsTable: React.FC = () => {
  // TODO wire up this data
  const items: CurationSuggestion[] = [
    {
      query: 'foo',
      updated_at: '2021-07-08T14:35:50Z',
      promoted: ['1', '2'],
    },
  ];
  const meta = {
    page: {
      current: 1,
      size: 10,
      total_results: 100,
      total_pages: 10,
    },
  };
  const totalSuggestions = meta.page.total_results;
  // TODO
  // @ts-ignore
  const onPaginate = (...params) => {
    // eslint-disable-next-line no-console
    console.log('paging...');
    // eslint-disable-next-line no-console
    console.log(params);
  };
  const isLoading = false;

  return (
    <DataPanel
      icon={<LightbulbIcon />}
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.title',
            {
              defaultMessage: '{totalSuggestions} Suggestions',
              values: { totalSuggestions },
            }
          )}
        </h2>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.description',
        {
          defaultMessage:
            'Based on your analytics, results for the following queries could be improved by promoting some documents.',
        }
      )}
      hasBorder
    >
      <EuiBasicTable
        columns={columns}
        items={items}
        responsive
        hasActions
        loading={isLoading}
        pagination={{
          ...convertMetaToPagination(meta),
          hidePerPageOptions: true,
        }}
        onChange={handlePageChange(onPaginate)}
      />
    </DataPanel>
  );
};
