/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions';
import { UserAssetTableType } from '../../../explore/users/store/model';
import { usersActions, usersSelectors } from '../../../explore/users/store';
import { fieldHasCellActions } from '../../utils';
import type { SecurityAppStore } from '../../../common/store';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

const ICON = 'listAdd';
const TOGGLE_FIELD = i18n.translate(
  'xpack.securitySolution.actions.toggleFieldToAssetTable.label',
  {
    defaultMessage: 'Toggle field in asset table',
  }
);

export const createToggleUserAssetFieldCellActionFactory = createCellActionFactory(
  ({ store }: { store: SecurityAppStore }): CellActionTemplate<SecurityCellAction> => ({
    type: SecurityCellActionType.TOGGLE_COLUMN,
    getIconType: () => ICON,
    getDisplayName: () => TOGGLE_FIELD,
    getDisplayNameTooltip: ({ data }) => TOGGLE_FIELD,
    isCompatible: async ({ data, metadata }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 &&
        fieldHasCellActions(field.name) &&
        !metadata?.isObjectArray &&
        !!metadata?.scopeId &&
        Object.values(UserAssetTableType).includes(
          metadata?.scopeId as unknown as UserAssetTableType
        )
      );
    },
    execute: async ({ metadata, data }) => {
      const field = data[0]?.field;
      const scopeId = metadata?.scopeId as UserAssetTableType | undefined;

      if (!scopeId) return;

      const { fields } = usersSelectors.selectUserAssetTableById(store.getState(), scopeId);

      if (fields.some((f) => f === field.name)) {
        store.dispatch(
          usersActions.removeUserAssetTableField({
            fieldName: field.name,
            tableId: scopeId,
          })
        );
      } else {
        store.dispatch(
          usersActions.addUserAssetTableField({
            fieldName: field.name,
            tableId: scopeId,
          })
        );
      }
    },
  })
);
