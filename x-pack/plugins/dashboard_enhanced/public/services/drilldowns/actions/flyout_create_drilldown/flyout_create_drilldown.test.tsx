/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import {
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  FlyoutCreateDrilldownAction,
  OpenFlyoutAddDrilldownParams,
} from './flyout_create_drilldown';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';
import { UiActionsEnhancedActionFactory } from '@kbn/ui-actions-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';

function createAction(
  allPossibleTriggers = ['VALUE_CLICK_TRIGGER'],
  overlays = coreMock.createStart().overlays
) {
  const uiActionsEnhanced = uiActionsEnhancedPluginMock.createStartContract();
  const params: OpenFlyoutAddDrilldownParams = {
    start: () => ({
      core: {
        overlays,
        application: {
          currentAppId$: new Subject(),
        },
        theme: {
          theme$: new Subject(),
        },
      } as any,
      plugins: {
        uiActionsEnhanced,
      },
      self: {},
    }),
  };

  uiActionsEnhanced.getActionFactories.mockImplementation(() => [
    {
      supportedTriggers: () => allPossibleTriggers,
      isCompatibleLicense: () => true,
    } as unknown as UiActionsEnhancedActionFactory,
  ]);
  return new FlyoutCreateDrilldownAction(params);
}
const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
  dynamicActions: { events: [] },
});

const compatibleEmbeddableApi = {
  enhancements: {
    dynamicActions: new DynamicActionManager({
      storage: new MemoryActionStorage(),
      isCompatible: async () => true,
      uiActions: uiActionsEnhancedPluginMock.createStartContract(),
    }),
  },
  setDynamicActions: (newDynamicActions: DynamicActionsSerializedState['enhancements']) => {
    dynamicActionsState$.next(newDynamicActions);
  },
  dynamicActionsState$,
  parentApi: {
    type: 'dashboard',
  },
  supportedTriggers: () => {
    return ['VALUE_CLICK_TRIGGER'];
  },
  viewMode: new BehaviorSubject<ViewMode>('edit'),
};

test('title is a string', () => {
  expect(typeof createAction().getDisplayName() === 'string').toBe(true);
});

test('icon exists', () => {
  expect(typeof createAction().getIconType() === 'string').toBe(true);
});

describe('isCompatible', () => {
  test("compatible if dynamicUiActions enabled, 'VALUE_CLICK_TRIGGER' is supported, in edit mode", async () => {
    const action = createAction();
    expect(await action.isCompatible({ embeddable: compatibleEmbeddableApi })).toBe(true);
  });

  test('not compatible if embeddable is not enhanced', async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test("not compatible if 'VALUE_CLICK_TRIGGER' is not supported", async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      supportedTriggers: () => {
        return [];
      },
    };
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test('not compatible if in view mode', async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      viewMode: new BehaviorSubject<ViewMode>('view'),
    };
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test('not compatible if parent embeddable is not "dashboard"', async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      parentApi: {
        type: 'visualization',
      },
    };
    expect(await action.isCompatible({ embeddable: embeddableApi })).toBe(false);
  });

  test('not compatible if no triggers intersect', async () => {
    expect(await createAction([]).isCompatible({ embeddable: compatibleEmbeddableApi })).toBe(
      false
    );
    expect(
      await createAction(['SELECT_RANGE_TRIGGER']).isCompatible({
        embeddable: compatibleEmbeddableApi,
      })
    ).toBe(false);
  });
});

describe('execute', () => {
  test('throws if no dynamicUiActions', async () => {
    const action = createAction();
    const embeddableApi = {
      ...compatibleEmbeddableApi,
      enhancements: undefined,
    };
    await expect(
      action.execute({ embeddable: embeddableApi })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action is incompatible"`);
  });

  test('should open flyout', async () => {
    const overlays = coreMock.createStart().overlays;
    const spy = jest.spyOn(overlays, 'openFlyout');
    const action = createAction(['VALUE_CLICK_TRIGGER'], overlays);
    await action.execute({ embeddable: compatibleEmbeddableApi });
    expect(spy).toBeCalled();
  });
});
