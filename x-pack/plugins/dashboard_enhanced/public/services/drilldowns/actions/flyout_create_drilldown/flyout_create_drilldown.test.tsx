/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlyoutCreateDrilldownAction,
  OpenFlyoutAddDrilldownParams,
} from './flyout_create_drilldown';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { ViewMode } from '../../../../../../../../src/plugins/embeddable/public';
import { TriggerContextMapping } from '../../../../../../../../src/plugins/ui_actions/public';
import { MockEmbeddable, enhanceEmbeddable } from '../test_helpers';
import { uiActionsEnhancedPluginMock } from '../../../../../../ui_actions_enhanced/public/mocks';

const overlays = coreMock.createStart().overlays;
const uiActionsEnhanced = uiActionsEnhancedPluginMock.createStartContract();

const actionParams: OpenFlyoutAddDrilldownParams = {
  start: () => ({
    core: {
      overlays,
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
}

describe('isCompatible', () => {
  const drilldownAction = new FlyoutCreateDrilldownAction(actionParams);

  async function assertCompatibility(
    {
      isEdit = true,
      isValueClickTriggerSupported = true,
      isEmbeddableEnhanced = true,
      rootType = 'dashboard',
    }: CompatibilityParams,
    expectedResult: boolean = true
  ): Promise<void> {
    let embeddable = new MockEmbeddable(
      { id: '', viewMode: isEdit ? ViewMode.EDIT : ViewMode.VIEW },
      {
        supportedTriggers: (isValueClickTriggerSupported ? ['VALUE_CLICK_TRIGGER'] : []) as Array<
          keyof TriggerContextMapping
        >,
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
