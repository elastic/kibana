/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Embeddable } from '@kbn/embeddable-plugin/public';

import { createResetGroupByFieldAction, showInitialLoadingSpinner } from './helpers';
import type { LensDataTableEmbeddable } from '../../../../common/components/visualization_actions/types';

describe('helpers', () => {
  describe('showInitialLoadingSpinner', () => {
    test('it should (only) show the spinner during initial loading, while we are fetching data', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: true, isLoadingAlerts: true })).toBe(
        true
      );
    });

    test('it should STOP showing the spinner (during initial loading) when the first data fetch completes', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: true, isLoadingAlerts: false })).toBe(
        false
      );
    });

    test('it should NOT show the spinner after initial loading has completed, even if the user requests more data (e.g. by clicking Refresh)', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: false, isLoadingAlerts: true })).toBe(
        false
      );
    });

    test('it should NOT show the spinner after initial loading has completed', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: false, isLoadingAlerts: false })).toBe(
        false
      );
    });
  });
});

describe('createResetGroupByFieldAction', () => {
  let action: Action;
  const embeddable = {
    getInput: jest.fn().mockReturnValue({
      attributes: {
        title: 'test',
        description: '',
        visualizationType: 'lnsDatatable',
        state: {
          visualization: {
            columns: [
              {
                columnId: '2881fedd-54b7-42ba-8c97-5175dec86166',
                isTransposed: false,
                width: 362,
              },
              {
                columnId: 'f04a71a3-399f-4d32-9efc-8a005e989991',
                isTransposed: false,
              },
              {
                columnId: '75ce269b-ee9c-4c7d-a14e-9226ba0fe059',
                isTransposed: false,
                hidden: true,
              },
            ],
            layerId: '03b95315-16ce-4146-a76a-621f9d4422f9',
            layerType: 'data',
          },
        },
      },
    } as unknown as Embeddable<LensDataTableEmbeddable>),
    updateInput: jest.fn(),
  };

  const context = {
    embeddable,
  } as unknown as ActionExecutionContext<Embeddable<LensDataTableEmbeddable>>;
  const mockCallback = jest.fn();
  beforeAll(async () => {
    action = createResetGroupByFieldAction({ callback: mockCallback });
    await action.execute(context);
  });
  test('should return a correct id', () => {
    expect(action.id).toEqual('resetGroupByField');
  });

  test('should return display name', () => {
    expect(action.getDisplayName(context)).toEqual('Reset group by fields');
  });

  test('should return an icon', () => {
    expect(action.getIconType(context)).toEqual('editorRedo');
  });

  test('should return icon type', () => {
    expect(action.type).toEqual('actionButton');
  });

  test('should execute callback', () => {
    expect(mockCallback).toHaveBeenCalled();
  });

  test('should unhide all the columns', () => {
    expect(embeddable.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: {
          description: '',
          state: {
            visualization: {
              columns: [
                {
                  columnId: '2881fedd-54b7-42ba-8c97-5175dec86166',
                  hidden: false,
                  isTransposed: false,
                  width: 362,
                },
                {
                  columnId: 'f04a71a3-399f-4d32-9efc-8a005e989991',
                  hidden: false,
                  isTransposed: false,
                },
                {
                  columnId: '75ce269b-ee9c-4c7d-a14e-9226ba0fe059',
                  hidden: false,
                  isTransposed: false,
                },
              ],
              layerId: '03b95315-16ce-4146-a76a-621f9d4422f9',
              layerType: 'data',
            },
          },
          title: 'test',
          visualizationType: 'lnsDatatable',
        },
      })
    );
  });
});
