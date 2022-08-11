/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import {
  FlyoutCreateDrilldownAction,
  OpenFlyoutAddDrilldownParams,
} from './flyout_create_drilldown';
import { coreMock } from '@kbn/core/public/mocks';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { MockEmbeddable, enhanceEmbeddable } from '../test_helpers';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';
import { UiActionsEnhancedActionFactory } from '@kbn/ui-actions-enhanced-plugin/public';

const overlays = coreMock.createStart().overlays;
const uiActionsEnhanced = uiActionsEnhancedPluginMock.createStartContract();

const actionParams: OpenFlyoutAddDrilldownParams = {
  start: () => ({
    core: {
      overlays,
      application: {
        currentAppId$: new Subject(),
      },
    } as any,
    plugins: {
      uiActionsEnhanced,
    },
    self: {},
  }),
};

test('should create', () => {
  expect(() => new FlyoutCreateDrilldownAction(actionParams)).not.toThrow();
});

test('title is a string', () => {
  expect(typeof new FlyoutCreateDrilldownAction(actionParams).getDisplayName() === 'string').toBe(
    true
  );
});

test('icon exists', () => {
  expect(typeof new FlyoutCreateDrilldownAction(actionParams).getIconType() === 'string').toBe(
    true
  );
});

interface CompatibilityParams {
  isEdit?: boolean;
  isValueClickTriggerSupported?: boolean;
  isEmbeddableEnhanced?: boolean;
  rootType?: string;
  actionFactoriesTriggers?: string[];
}

describe('isCompatible', () => {
  const drilldownAction = new FlyoutCreateDrilldownAction(actionParams);

  async function assertCompatibility(
    {
      isEdit = true,
      isValueClickTriggerSupported = true,
      isEmbeddableEnhanced = true,
      rootType = 'dashboard',
      actionFactoriesTriggers = ['VALUE_CLICK_TRIGGER'],
    }: CompatibilityParams,
    expectedResult: boolean = true
  ): Promise<void> {
    uiActionsEnhanced.getActionFactories.mockImplementation(() => [
      {
        supportedTriggers: () => actionFactoriesTriggers,
        isCompatibleLicense: () => true,
      } as unknown as UiActionsEnhancedActionFactory,
    ]);

    let embeddable = new MockEmbeddable(
      { id: '', viewMode: isEdit ? ViewMode.EDIT : ViewMode.VIEW },
      {
        supportedTriggers: isValueClickTriggerSupported ? ['VALUE_CLICK_TRIGGER'] : [],
      }
    );

    embeddable.rootType = rootType;

    if (isEmbeddableEnhanced) {
      embeddable = enhanceEmbeddable(embeddable);
    }

    const result = await drilldownAction.isCompatible({
      embeddable,
    });

    expect(result).toBe(expectedResult);
  }

  const assertNonCompatibility = (params: CompatibilityParams) =>
    assertCompatibility(params, false);

  test("compatible if dynamicUiActions enabled, 'VALUE_CLICK_TRIGGER' is supported, in edit mode", async () => {
    await assertCompatibility({});
  });

  test('not compatible if embeddable is not enhanced', async () => {
    await assertNonCompatibility({
      isEmbeddableEnhanced: false,
    });
  });

  test("not compatible if 'VALUE_CLICK_TRIGGER' is not supported", async () => {
    await assertNonCompatibility({
      isValueClickTriggerSupported: false,
    });
  });

  test('not compatible if in view mode', async () => {
    await assertNonCompatibility({
      isEdit: false,
    });
  });

  test('not compatible if root embeddable is not "dashboard"', async () => {
    await assertNonCompatibility({
      rootType: 'visualization',
    });
  });

  test('not compatible if no triggers intersect', async () => {
    await assertNonCompatibility({
      actionFactoriesTriggers: [],
    });
    await assertNonCompatibility({
      actionFactoriesTriggers: ['SELECT_RANGE_TRIGGER'],
    });
  });
});

describe('execute', () => {
  const drilldownAction = new FlyoutCreateDrilldownAction(actionParams);

  test('throws error if no dynamicUiActions', async () => {
    await expect(
      drilldownAction.execute({
        embeddable: new MockEmbeddable({ id: '' }, {}),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Need embeddable to be EnhancedEmbeddable to execute FlyoutCreateDrilldownAction."`
    );
  });

  test('should open flyout', async () => {
    const spy = jest.spyOn(overlays, 'openFlyout');
    const embeddable = enhanceEmbeddable(new MockEmbeddable({ id: '' }, {}));

    await drilldownAction.execute({
      embeddable,
    });

    expect(spy).toBeCalled();
  });
});
