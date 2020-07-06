/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlyoutEditDrilldownAction, FlyoutEditDrilldownParams } from './flyout_edit_drilldown';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { ViewMode } from '../../../../../../../../src/plugins/embeddable/public';
import { uiActionsEnhancedPluginMock } from '../../../../../../ui_actions_enhanced/public/mocks';
import { EnhancedEmbeddable } from '../../../../../../embeddable_enhanced/public';
import { MockEmbeddable, enhanceEmbeddable } from '../test_helpers';

const overlays = coreMock.createStart().overlays;
const uiActionsPlugin = uiActionsEnhancedPluginMock.createPlugin();
const uiActions = uiActionsPlugin.doStart();

uiActionsPlugin.setup.registerDrilldown({
  id: 'foo',
  CollectConfig: {} as any,
  createConfig: () => ({}),
  isConfigValid: () => true,
  execute: async () => {},
  getDisplayName: () => 'test',
});

const actionParams: FlyoutEditDrilldownParams = {
  start: () => ({
    core: {
      overlays,
    } as any,
    plugins: {
      uiActionsEnhanced: uiActions,
    },
    self: {},
  }),
};

test('should create', () => {
  expect(() => new FlyoutEditDrilldownAction(actionParams)).not.toThrow();
});

test('title is a string', () => {
  expect(typeof new FlyoutEditDrilldownAction(actionParams).getDisplayName() === 'string').toBe(
    true
  );
});

test('icon exists', () => {
  expect(typeof new FlyoutEditDrilldownAction(actionParams).getIconType() === 'string').toBe(true);
});

test('MenuItem exists', () => {
  expect(new FlyoutEditDrilldownAction(actionParams).MenuItem).toBeDefined();
});

describe('isCompatible', () => {
  function setupIsCompatible({
    isEdit = true,
    isEmbeddableEnhanced = true,
  }: {
    isEdit?: boolean;
    isEmbeddableEnhanced?: boolean;
  } = {}) {
    const action = new FlyoutEditDrilldownAction(actionParams);
    const input = {
      id: '',
      viewMode: isEdit ? ViewMode.EDIT : ViewMode.VIEW,
    };
    const embeddable = new MockEmbeddable(input, {});
    const context = {
      embeddable: (isEmbeddableEnhanced
        ? enhanceEmbeddable(embeddable, uiActions)
        : embeddable) as EnhancedEmbeddable<MockEmbeddable>,
    };

    return {
      action,
      context,
    };
  }

  test('not compatible if no drilldowns', async () => {
    const { action, context } = setupIsCompatible();
    expect(await action.isCompatible(context)).toBe(false);
  });

  test('not compatible if embeddable is not enhanced', async () => {
    const { action, context } = setupIsCompatible({ isEmbeddableEnhanced: false });
    expect(await action.isCompatible(context)).toBe(false);
  });

  describe('when has at least one drilldown', () => {
    test('is compatible in edit mode', async () => {
      const { action, context } = setupIsCompatible();

      await context.embeddable.enhancements.dynamicActions.createEvent(
        {
          config: {},
          factoryId: 'foo',
          name: '',
        },
        ['VALUE_CLICK_TRIGGER']
      );

      expect(await action.isCompatible(context)).toBe(true);
    });

    test('not compatible in view mode', async () => {
      const { action, context } = setupIsCompatible({ isEdit: false });

      await context.embeddable.enhancements.dynamicActions.createEvent(
        {
          config: {},
          factoryId: 'foo',
          name: '',
        },
        ['VALUE_CLICK_TRIGGER']
      );

      expect(await action.isCompatible(context)).toBe(false);
    });
  });
});

describe('execute', () => {
  const drilldownAction = new FlyoutEditDrilldownAction(actionParams);

  test('throws error if no dynamicUiActions', async () => {
    await expect(
      drilldownAction.execute({
        embeddable: new MockEmbeddable({ id: '' }, {}),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Need embeddable to be EnhancedEmbeddable to execute FlyoutEditDrilldownAction."`
    );
  });

  test('should open flyout', async () => {
    const spy = jest.spyOn(overlays, 'openFlyout');
    await drilldownAction.execute({
      embeddable: enhanceEmbeddable(new MockEmbeddable({ id: '' }, {})),
    });
    expect(spy).toBeCalled();
  });
});
