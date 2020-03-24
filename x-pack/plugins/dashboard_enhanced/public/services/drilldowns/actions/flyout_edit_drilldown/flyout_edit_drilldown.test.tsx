/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlyoutEditDrilldownAction, FlyoutEditDrilldownParams } from './flyout_edit_drilldown';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { drilldownsPluginMock } from '../../../../../../drilldowns/public/mocks';
import { ViewMode } from '../../../../../../../../src/plugins/embeddable/public';
import { uiActionsPluginMock } from '../../../../../../../../src/plugins/ui_actions/public/mocks';
import { MockEmbeddable } from '../test_helpers';

const overlays = coreMock.createStart().overlays;
const drilldowns = drilldownsPluginMock.createStartContract();
const uiActions = uiActionsPluginMock.createStartContract();

const actionParams: FlyoutEditDrilldownParams = {
  drilldowns: () => Promise.resolve(drilldowns),
  overlays: () => Promise.resolve(overlays),
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
  const drilldownAction = new FlyoutEditDrilldownAction(actionParams);

  function checkCompatibility(params: {
    isEdit: boolean;
    withUiActions: boolean;
  }): Promise<boolean> {
    return drilldownAction.isCompatible({
      embeddable: new MockEmbeddable(
        {
          id: '',
          viewMode: params.isEdit ? ViewMode.EDIT : ViewMode.VIEW,
        },
        {
          uiActions: params.withUiActions ? uiActions : undefined, // dynamic actions support
        }
      ),
    });
  }

  // TODO: need proper DynamicActionsMock and ActionFactory mock
  test.todo('compatible if dynamicUiActions enabled, in edit view, and have at least 1 drilldown');

  test('not compatible if dynamicUiActions disabled', async () => {
    expect(
      await checkCompatibility({
        withUiActions: false,
        isEdit: true,
      })
    ).toBe(false);
  });

  test('not compatible if no drilldowns', async () => {
    expect(
      await checkCompatibility({
        withUiActions: true,
        isEdit: true,
      })
    ).toBe(false);
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
      `"Can't execute FlyoutEditDrilldownAction without dynamicActionsManager"`
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
