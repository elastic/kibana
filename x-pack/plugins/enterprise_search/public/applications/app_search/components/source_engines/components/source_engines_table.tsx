/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import { ENGINE_PATH } from '../../../routes';
import { generateEncodedPath } from '../../../utils/encode_path_params';
import { EngineDetails } from '../../engine/types';
import {
  NAME_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  ACTIONS_COLUMN,
} from '../../engines/components/tables/shared_columns';

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

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (engineName: string) => (
        <EuiLinkTo to={generateEncodedPath(ENGINE_PATH, { engineName })}>{engineName}</EuiLinkTo>
      ),
    },
    DOCUMENT_COUNT_COLUMN,
    FIELD_COUNT_COLUMN,
  ];
  if (canManageMetaEngineSourceEngines) {
    columns.push({
      name: ACTIONS_COLUMN.name,
      actions: [
        {
          name: REMOVE_SOURCE_ENGINE_BUTTON_LABEL,
          description: REMOVE_SOURCE_ENGINE_BUTTON_LABEL,
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (engine: EngineDetails) => {
            if (confirm(REMOVE_SOURCE_ENGINE_CONFIRM_DIALOGUE(engine.name))) {
              removeSourceEngine(engine.name);
            }
          },
        },
      ],
    });
  }

  return (
    <EuiInMemoryTable
      items={sourceEngines}
      columns={columns}
      pagination={sourceEngines.length > 10}
      search={{ box: { incremental: true } }}
    />
  );
};
