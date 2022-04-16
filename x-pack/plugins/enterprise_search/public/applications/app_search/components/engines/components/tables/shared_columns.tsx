/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';

import { EnginesLogic } from '../..';
import { MANAGE_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../../../../../shared/constants';
import { FormattedDateTime } from '../../../../utils/formatted_date_time';
import { EngineDetails } from '../../../engine/types';

import { navigateToEngine } from './engine_link_helpers';

export const BLANK_COLUMN: EuiTableComputedColumnType<EngineDetails> = {
  render: () => <></>,
  'aria-hidden': true,
};

export const NAME_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'name',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.name', {
    defaultMessage: 'Name',
  }),
  width: '30%',
  truncateText: true,
  mobileOptions: {
    header: true,
    enlarge: true,
    width: '100%',
  },
};

export const CREATED_AT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'created_at',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.createdAt', {
    defaultMessage: 'Created at',
  }),
  dataType: 'string',
  render: (dateString: string) => <FormattedDateTime date={new Date(dateString)} hideTime />,
};

export const LAST_UPDATED_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'updated_at',
  name: i18n.translate(
    'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.lastUpdated',
    {
      defaultMessage: 'Last updated',
    }
  ),
  dataType: 'string',
};

export const DOCUMENT_COUNT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'document_count',
  name: i18n.translate(
    'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.documentCount',
    {
      defaultMessage: 'Document count',
    }
  ),
  dataType: 'number',
  render: (number: number) => <FormattedNumber value={number} />,
  truncateText: true,
};

export const FIELD_COUNT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'field_count',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.fieldCount', {
    defaultMessage: 'Field count',
  }),
  dataType: 'number',
  render: (number: number) => <FormattedNumber value={number} />,
  truncateText: true,
};

export const ACTIONS_COLUMN: EuiTableActionsColumnType<EngineDetails> = {
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.actions', {
    defaultMessage: 'Actions',
  }),
  actions: [
    {
      name: MANAGE_BUTTON_LABEL,
      description: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.manage.buttonDescription',
        {
          defaultMessage: 'Manage this engine',
        }
      ),
      type: 'icon',
      icon: 'eye',
      onClick: (engineDetails) => navigateToEngine(engineDetails.name),
    },
    {
      name: DELETE_BUTTON_LABEL,
      description: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.buttonDescription',
        {
          defaultMessage: 'Delete this engine',
        }
      ),
      type: 'icon',
      icon: 'trash',
      color: 'danger',
      onClick: (engine) => {
        if (
          window.confirm(
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.confirmationPopupMessage',
              {
                defaultMessage:
                  'Are you sure you want to permanently delete "{engineName}" and all of its content?',
                values: {
                  engineName: engine.name,
                },
              }
            )
          )
        ) {
          EnginesLogic.actions.deleteEngine(engine);
        }
      },
    },
  ],
};
