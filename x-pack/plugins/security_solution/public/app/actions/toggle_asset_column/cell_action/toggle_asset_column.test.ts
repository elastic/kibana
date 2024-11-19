/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { createToggleUserAssetFieldCellActionFactory } from './toggle_asset_column';
import type { SecurityAppStore } from '../../../../common/store/types';
import { mockGlobalState } from '../../../../common/mock';
import { UserAssetTableType } from '../../../../explore/users/store/model';
import { usersActions } from '../../../../explore/users/store';

const existingFieldName = 'existing.field';
const fieldName = 'user.name';

const mockToggleColumn = jest.fn();
const mockDispatch = jest.fn();
const mockGetState = jest.fn().mockReturnValue({
  ...mockGlobalState,
  users: {
    ...mockGlobalState.users,
    flyout: {
      ...mockGlobalState.users.flyout,
      queries: {
        [UserAssetTableType.assetEntra]: {
          fields: [existingFieldName],
        },
        [UserAssetTableType.assetOkta]: {
          fields: [existingFieldName],
        },
      },
    },
  },
});

const store = {
  dispatch: mockDispatch,
  getState: mockGetState,
} as unknown as SecurityAppStore;

const context = {
  data: [
    {
      field: { name: fieldName },
    },
  ],
  metadata: {
    scopeId: UserAssetTableType.assetEntra,
  },
} as unknown as CellActionExecutionContext;

describe('createToggleUserAssetFieldCellActionFactory', () => {
  const toggleColumnActionFactory = createToggleUserAssetFieldCellActionFactory({
    store,
  });
  const toggleColumnAction = toggleColumnActionFactory({ id: 'testAction' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(toggleColumnAction.getDisplayName(context)).toEqual('Toggle field in asset table');
  });

  it('should return icon type', () => {
    expect(toggleColumnAction.getIconType(context)).toEqual('listAdd');
  });

  describe('isCompatible', () => {
    it('should return false if scopeId is undefined', async () => {
      expect(
        await toggleColumnAction.isCompatible({ ...context, metadata: { scopeId: undefined } })
      ).toEqual(false);
    });

    it('should return false if scopeId is different than Okta or Entra asset table', async () => {
      expect(
        await toggleColumnAction.isCompatible({
          ...context,
          metadata: { scopeId: 'test-scopeId-1234' },
        })
      ).toEqual(false);
    });

    it('should return true if scopeId is okta or entra asset table', async () => {
      expect(
        await toggleColumnAction.isCompatible({
          ...context,
          metadata: { scopeId: UserAssetTableType.assetEntra },
        })
      ).toEqual(true);
      expect(
        await toggleColumnAction.isCompatible({
          ...context,
          metadata: { scopeId: UserAssetTableType.assetOkta },
        })
      ).toEqual(true);
    });
  });

  describe('execute', () => {
    afterEach(() => {
      mockToggleColumn.mockClear();
    });
    it('should remove field', async () => {
      await toggleColumnAction.execute({
        ...context,
        data: [
          { ...context.data[0], field: { ...context.data[0].field, name: existingFieldName } },
        ],
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        usersActions.removeUserAssetTableField({
          tableId: UserAssetTableType.assetEntra,
          fieldName: existingFieldName,
        })
      );
    });

    it('should add field', async () => {
      const name = 'new-field-name';
      await toggleColumnAction.execute({
        ...context,
        data: [{ ...context.data[0], field: { ...context.data[0].field, name } }],
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        usersActions.addUserAssetTableField({
          tableId: UserAssetTableType.assetEntra,
          fieldName: name,
        })
      );
    });
  });
});
