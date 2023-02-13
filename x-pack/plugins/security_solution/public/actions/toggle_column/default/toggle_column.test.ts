/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { KibanaServices } from '../../../common/lib/kibana';
import { TableId } from '../../../../common/types';
import { createToggleColumnAction } from './toggle_column';

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { mockGlobalState } from '../../../common/mock';
import { dataTableActions } from '../../../common/store/data_table';

jest.mock('../../../common/lib/kibana');

const mockWarningToast = jest.fn();
KibanaServices.get().notifications.toasts.addWarning = mockWarningToast;

const mockDispatch = jest.fn();
const mockGetState = jest.fn().mockReturnValue(mockGlobalState);
const store = {
  dispatch: mockDispatch,
  getState: mockGetState,
} as unknown as SecurityAppStore;

const value = 'the-value';
const fieldName = 'user.name';
const context = {
  field: { name: fieldName, value, type: 'text' },
  metadata: {
    scopeId: TableId.test,
  },
} as unknown as CellActionExecutionContext;

describe('Default createToggleColumnAction', () => {
  const toggleColumnAction = createToggleColumnAction({ store, order: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(toggleColumnAction.getDisplayName(context)).toEqual('Toggle column in table');
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

    it('should return false if scopeId is different than timeline and dataGrid', async () => {
      expect(
        await toggleColumnAction.isCompatible({
          ...context,
          metadata: { scopeId: 'test-scopeId-1234' },
        })
      ).toEqual(false);
    });

    it('should return true if everything is okay', async () => {
      expect(await toggleColumnAction.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should remove column', async () => {
      await toggleColumnAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith(
        dataTableActions.removeColumn({
          columnId: fieldName,
          id: TableId.test,
        })
      );
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should add column', async () => {
      const name = 'fake-field-name';
      await toggleColumnAction.execute({ ...context, field: { ...context.field, name } });
      expect(mockDispatch).toHaveBeenCalledWith(
        dataTableActions.upsertColumn({
          column: {
            columnHeaderType: 'not-filtered',
            id: name,
            initialWidth: 180,
          },
          id: TableId.test,
          index: 1,
        })
      );
      expect(mockWarningToast).not.toHaveBeenCalled();
    });
  });
});
