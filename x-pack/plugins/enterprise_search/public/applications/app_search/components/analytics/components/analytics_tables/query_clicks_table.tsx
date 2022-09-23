/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { ENGINE_DOCUMENT_DETAIL_PATH } from '../../../../routes';
import { DOCUMENTS_TITLE } from '../../../documents';
import { generateEnginePath, EngineLogic } from '../../../engine';

import { QueryClick } from '../../types';

import { FIRST_COLUMN_PROPS, TAGS_LIST_COLUMN, COUNT_COLUMN_PROPS } from './shared_columns';

interface Props {
  items: QueryClick[];
}
type Columns = Array<EuiBasicTableColumn<QueryClick>>;

export const QueryClicksTable: React.FC<Props> = ({ items }) => {
  const { engineName } = EngineLogic.values;

  const DOCUMENT_COLUMN = {
    ...FIRST_COLUMN_PROPS,
    field: 'document',
    name: DOCUMENTS_TITLE,
    render: (document: QueryClick['document'], query: QueryClick) => {
      return document ? (
        <EuiLinkTo
          to={generateEnginePath(ENGINE_DOCUMENT_DETAIL_PATH, {
            engineName,
            documentId: document.id,
          })}
        >
          {document.id}
        </EuiLinkTo>
      ) : (
        query.key
      );
    },
  };

  const CLICKS_COLUMN = {
    ...COUNT_COLUMN_PROPS,
    field: 'doc_count',
    name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.clicksColumn', {
      defaultMessage: 'Clicks',
    }),
  };

  return (
    <EuiBasicTable
      columns={[DOCUMENT_COLUMN, TAGS_LIST_COLUMN, CLICKS_COLUMN] as Columns}
      items={items}
      responsive
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="visLine"
          title={
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noClicksTitle',
                { defaultMessage: 'No clicks' }
              )}
            </h4>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.analytics.table.empty.noClicksDescription',
            { defaultMessage: 'No documents have been clicked from this query.' }
          )}
        />
      }
    />
  );
};
