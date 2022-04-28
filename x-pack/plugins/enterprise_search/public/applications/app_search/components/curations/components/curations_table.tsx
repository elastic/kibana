/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiBadge, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EDIT_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { KibanaLogic } from '../../../../shared/kibana';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';

import { ENGINE_CURATION_PATH } from '../../../routes';
import { FormattedDateTime } from '../../../utils/formatted_date_time';
import { DataPanel } from '../../data_panel';
import { generateEnginePath } from '../../engine';

import { CurationsLogic } from '../curations_logic';
import { Curation } from '../types';
import { convertToDate } from '../utils';

import { AutomatedIcon } from './automated_icon';

import './curations_table.scss';

export const CurationsTable: React.FC = () => {
  const { dataLoading, curations, meta } = useValues(CurationsLogic);
  const { onPaginate, deleteCuration } = useActions(CurationsLogic);

  const columns: Array<EuiBasicTableColumn<Curation>> = [
    {
      field: 'queries',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.table.column.queries',
        { defaultMessage: 'Queries' }
      ),
      render: (queries: Curation['queries'], curation: Curation) => (
        <EuiLinkTo
          data-test-subj="CurationsTableQueriesLink"
          to={generateEnginePath(ENGINE_CURATION_PATH, { curationId: curation.id })}
        >
          {queries.join(', ')}
          {curation.suggestion?.status === 'automated' && (
            <>
              <EuiBadge color="accent" iconType={AutomatedIcon} className="curationsTableBadge">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.table.automatedLabel',
                  { defaultMessage: 'Automated' }
                )}
              </EuiBadge>
            </>
          )}
          {curation.suggestion?.status === 'pending' && (
            <>
              <EuiBadge color="default" className="curationsTableBadge">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.table.newSuggestionLabel',
                  { defaultMessage: 'New suggestion' }
                )}
              </EuiBadge>
            </>
          )}
        </EuiLinkTo>
      ),
      width: '40%',
      truncateText: true,
      mobileOptions: {
        header: true,
        enlarge: true,
        width: '100%',
      },
    },
    {
      field: 'last_updated',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.table.column.lastUpdated',
        { defaultMessage: 'Last updated' }
      ),
      width: '30%',
      dataType: 'string',
      render: (dateString: string) => <FormattedDateTime date={convertToDate(dateString)} />,
    },
    {
      width: '120px',
      actions: [
        {
          name: EDIT_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.table.editTooltip',
            { defaultMessage: 'Edit curation' }
          ),
          type: 'icon',
          icon: 'pencil',
          color: 'primary',
          onClick: (curation: Curation) => {
            const { navigateToUrl } = KibanaLogic.values;
            const url = generateEnginePath(ENGINE_CURATION_PATH, { curationId: curation.id });
            navigateToUrl(url);
          },
          'data-test-subj': 'CurationsTableEditButton',
        },
        {
          name: DELETE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.table.deleteTooltip',
            { defaultMessage: 'Delete curation' }
          ),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (curation: Curation) => deleteCuration(curation.id),
          'data-test-subj': 'CurationsTableDeleteButton',
        },
      ],
    },
  ];

  return (
    <DataPanel
      className="curationsTable"
      hasBorder
      iconType="package"
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.table.title', {
            defaultMessage: 'Active curations',
          })}
        </h2>
      }
    >
      <EuiBasicTable
        columns={columns}
        items={curations}
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
