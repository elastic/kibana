/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, CoreSetup } from '@kbn/core/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ADD_APM_SERVICE_MAP_PANEL_ACTION_ID } from './constants';
import { createAddServiceMapPanelAction } from './create_add_service_map_panel_action';
import type { EmbeddableDeps } from '../types';

const mockApiIsPresentationContainer = jest.fn();
const mockApiPublishesTimeRange = jest.fn();
const mockOpenLazyFlyout = jest.fn();

jest.mock('@kbn/presentation-publishing', () => ({
  apiIsPresentationContainer: (...args: unknown[]) => mockApiIsPresentationContainer(...args),
  apiPublishesTimeRange: (...args: unknown[]) => mockApiPublishesTimeRange(...args),
}));

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: (...args: unknown[]) => mockOpenLazyFlyout(...args),
}));

const mockCoreStart = {
  overlays: { openFlyout: jest.fn() },
} as unknown as CoreStart;

const mockDeps = {
  coreStart: mockCoreStart,
  pluginsStart: {},
  coreSetup: {} as CoreSetup,
  pluginsSetup: {},
  config: {},
  kibanaEnvironment: {},
  observabilityRuleTypeRegistry: {},
} as unknown as EmbeddableDeps;

describe('createAddServiceMapPanelAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPublishesTimeRange.mockReturnValue(false);
  });

  it('returns expected static action metadata', () => {
    const action = createAddServiceMapPanelAction(mockDeps);

    expect(action.id).toBe(ADD_APM_SERVICE_MAP_PANEL_ACTION_ID);
    expect(action.order).toBe(25);
    expect(action.getIconType!({} as never)).toBe('apps');
    expect(action.getDisplayName!({} as never)).toBe('Service map');
  });

  it('is compatible when embeddable is a presentation container', async () => {
    const embeddable = {};
    mockApiIsPresentationContainer.mockReturnValue(true);
    const action = createAddServiceMapPanelAction(mockDeps);

    await expect(action.isCompatible!({ embeddable })).resolves.toBe(true);
    expect(mockApiIsPresentationContainer).toHaveBeenCalledWith(embeddable);
  });

  it('is not compatible when embeddable is not a presentation container', async () => {
    mockApiIsPresentationContainer.mockReturnValue(false);
    const action = createAddServiceMapPanelAction(mockDeps);

    await expect(action.isCompatible!({ embeddable: {} })).resolves.toBe(false);
  });

  it('opens configuration flyout when executed', async () => {
    const embeddable = { addNewPanel: jest.fn() };
    mockApiIsPresentationContainer.mockReturnValue(true);
    const action = createAddServiceMapPanelAction(mockDeps);

    await action.execute({ embeddable } as never);

    expect(mockOpenLazyFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        core: mockCoreStart,
        parentApi: embeddable,
        loadContent: expect.any(Function),
      })
    );
  });

  it('throws IncompatibleActionError when executing against non-container embeddable', async () => {
    mockApiIsPresentationContainer.mockReturnValue(false);
    const action = createAddServiceMapPanelAction(mockDeps);

    await expect(action.execute({ embeddable: {} } as never)).rejects.toBeInstanceOf(
      IncompatibleActionError
    );
  });

  it('extracts time range from parent when apiPublishesTimeRange returns true', async () => {
    const mockTimeRange = { from: '2021-10-10T00:00:00.000Z', to: '2021-10-10T00:15:00.000Z' };
    const embeddable = {
      addNewPanel: jest.fn(),
      timeRange$: { getValue: () => mockTimeRange },
    };
    mockApiIsPresentationContainer.mockReturnValue(true);
    mockApiPublishesTimeRange.mockReturnValue(true);
    const action = createAddServiceMapPanelAction(mockDeps);

    await action.execute({ embeddable } as never);

    expect(mockApiPublishesTimeRange).toHaveBeenCalledWith(embeddable);
    expect(mockOpenLazyFlyout).toHaveBeenCalled();
  });

  it('passes undefined time range when apiPublishesTimeRange returns false', async () => {
    const embeddable = { addNewPanel: jest.fn() };
    mockApiIsPresentationContainer.mockReturnValue(true);
    mockApiPublishesTimeRange.mockReturnValue(false);
    const action = createAddServiceMapPanelAction(mockDeps);

    await action.execute({ embeddable } as never);

    expect(mockApiPublishesTimeRange).toHaveBeenCalledWith(embeddable);
    expect(mockOpenLazyFlyout).toHaveBeenCalled();
  });
});
