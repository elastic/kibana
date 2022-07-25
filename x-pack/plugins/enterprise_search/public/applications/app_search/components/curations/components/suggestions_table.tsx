/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBadge, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
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

import { SuggestionsLogic } from './suggestions_logic';

import './suggestions_table.scss';

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
    render: (query: string, curation: CurationSuggestion) => (
      <EuiLinkTo to={getSuggestionRoute(query)}>
        {query}
        {curation.override_manual_curation && (
          <>
            <EuiBadge iconType="alert" color="warning" className="suggestionsTableBadge">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsTable.overridesLabel',
                { defaultMessage: 'Overrides' }
              )}
            </EuiBadge>
          </>
        )}
      </EuiLinkTo>
    ),
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
      { defaultMessage: 'Promoted results' }
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
  const { loadSuggestions, onPaginate } = useActions(SuggestionsLogic);
  const { meta, suggestions, dataLoading } = useValues(SuggestionsLogic);

  useEffect(() => {
    loadSuggestions();
  }, [meta.page.current]);

  const totalSuggestions = meta.page.total_results;

  return (
    <DataPanel
      className="suggestionsTable"
      iconType={LightbulbIcon}
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
        items={suggestions}
        responsive
        hasActions
        loading={dataLoading}
        pagination={{
          ...convertMetaToPagination(meta),
          showPerPageOptions: false,
        }}
        onChange={handlePageChange(onPaginate)}
      />
    </DataPanel>
  );
};
