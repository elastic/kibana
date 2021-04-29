/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTableColumn, EuiButtonEmpty, EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import { ENGINE_PATH } from '../../../routes';
import { generateEncodedPath } from '../../../utils/encode_path_params';
import { EngineDetails } from '../../engine/types';
import { SourceEnginesLogic } from '../source_engines_logic';

const REMOVE_SOURCE_ENGINE_CONFIRM_DIALOGUE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.sourceEngines.removeEngineConfirmDialogue.description',
    {
      defaultMessage:
        'This will remove the engine, {engineName}, from this meta engine. All existing settings will be lost. Are you sure?',
      values: { engineName },
    }
  );

const REMOVE_SOURCE_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.sourceEngines.removeEngineButton.label',
  {
    defaultMessage: 'Remove from meta engine',
  }
);

export const SourceEnginesTable: React.FC = () => {
  const {
    myRole: { canManageMetaEngineSourceEngines },
  } = useValues(AppLogic);

  const { removeSourceEngine } = useActions(SourceEnginesLogic);
  const { sourceEngines } = useValues(SourceEnginesLogic);

  const metaEngineSourceEnginesTableActions = canManageMetaEngineSourceEngines
    ? [
        {
          render: (item: EngineDetails) => (
            <EuiButtonEmpty
              onClick={() => {
                if (confirm(REMOVE_SOURCE_ENGINE_CONFIRM_DIALOGUE(item.name))) {
                  removeSourceEngine(item.name);
                }
              }}
              size="s"
            >
              {REMOVE_SOURCE_ENGINE_BUTTON_LABEL}
            </EuiButtonEmpty>
          ),
        },
      ]
    : [];

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.sourceEngines.table.column.name', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      render: (engineName: string) => (
        <EuiLinkTo
          to={generateEncodedPath(ENGINE_PATH, { engineName })}
          data-test-subj="EngineName"
        >
          <strong>{engineName}</strong>
        </EuiLinkTo>
      ),
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.sourceEngines.table.column.documents',
        {
          defaultMessage: 'Documents',
        }
      ),
      field: 'document_count',
      width: '20%',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.sourceEngines.table.column.fields', {
        defaultMessage: 'Fields',
      }),
      field: 'field_count',
      width: '20%',
    },
    {
      name: '',
      actions: metaEngineSourceEnginesTableActions,
      width: '20%',
    },
  ];

  return (
    <EuiInMemoryTable
      items={sourceEngines}
      columns={columns}
      pagination={sourceEngines.length > 10}
      sorting
      allowNeutralSort
      search={{ box: { incremental: true } }}
      responsive={false}
    />
  );
};
