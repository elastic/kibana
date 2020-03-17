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
import { drilldownsPluginMock } from '../../../../../../drilldowns/public/mocks';
import {
  Embeddable,
  EmbeddableInput,
  ViewMode,
} from '../../../../../../../../src/plugins/embeddable/public';
import { uiActionsPluginMock } from '../../../../../../../../src/plugins/ui_actions/public/mocks';
import {
  TriggerContextMapping,
  UiActionsStart,
} from '../../../../../../../../src/plugins/ui_actions/public';

const overlays = coreMock.createStart().overlays;
const drilldowns = drilldownsPluginMock.createStartContract();
const uiActions = uiActionsPluginMock.createStartContract();

const actionParams: OpenFlyoutAddDrilldownParams = {
  drilldowns: () => Promise.resolve(drilldowns),
  overlays: () => Promise.resolve(overlays),
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

class MockEmbeddable extends Embeddable {
  public readonly type = 'mock';
  private readonly triggers: Array<keyof TriggerContextMapping> = [];
  constructor(
    initialInput: EmbeddableInput,
    params: { uiActions?: UiActionsStart; supportedTriggers?: Array<keyof TriggerContextMapping> }
  ) {
    super(initialInput, {}, undefined, params);
    this.triggers = params.supportedTriggers ?? [];
  }
  public render(node: HTMLElement) {}
  public reload() {}
  public supportedTriggers(): Array<keyof TriggerContextMapping> {
    return this.triggers;
  }
}

describe('isCompatible', () => {
  const drilldownAction = new FlyoutCreateDrilldownAction(actionParams);

  function checkCompatibility(params: {
    isEdit: boolean;
    withUiActions: boolean;
    isValueClickTriggerSupported: boolean;
  }): Promise<boolean> {
    return drilldownAction.isCompatible({
      embeddable: new MockEmbeddable(
        { id: '', viewMode: params.isEdit ? ViewMode.EDIT : ViewMode.VIEW },
        {
          supportedTriggers: (params.isValueClickTriggerSupported
            ? ['VALUE_CLICK_TRIGGER']
            : []) as Array<keyof TriggerContextMapping>,
          uiActions: params.withUiActions ? uiActions : undefined, // dynamic actions support
        }
      ),
    });
  }

  test("compatible if dynamicUiActions enabled, 'VALUE_CLICK_TRIGGER' is supported, in edit mode", async () => {
    expect(
      await checkCompatibility({
        withUiActions: true,
        isEdit: true,
        isValueClickTriggerSupported: true,
      })
    ).toBe(true);
  });

  test('not compatible if dynamicUiActions disabled', async () => {
    expect(
      await checkCompatibility({
        withUiActions: false,
        isEdit: true,
        isValueClickTriggerSupported: true,
      })
    ).toBe(false);
  });

  test("not compatible if 'VALUE_CLICK_TRIGGER' is not supported", async () => {
    expect(
      await checkCompatibility({
        withUiActions: true,
        isEdit: true,
        isValueClickTriggerSupported: false,
      })
    ).toBe(false);
  });

  test('not compatible if in view mode', async () => {
    expect(
      await checkCompatibility({
        withUiActions: true,
        isEdit: false,
        isValueClickTriggerSupported: true,
      })
    ).toBe(false);
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
      `"Can't execute FlyoutCreateDrilldownAction without dynamicActionsManager"`
    );
  });

  test('should open flyout', async () => {
    const spy = jest.spyOn(overlays, 'openFlyout');
    await drilldownAction.execute({
      embeddable: new MockEmbeddable({ id: '' }, { uiActions }),
    });
    expect(spy).toBeCalled();
  });
});
