/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { ADD_APM_SERVICE_MAP_PANEL_ACTION_ID, APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import { createAddServiceMapPanelAction } from './create_add_service_map_panel_action';

const mockApiIsPresentationContainer = jest.fn();

jest.mock('@kbn/presentation-publishing', () => ({
  apiIsPresentationContainer: (...args: unknown[]) => mockApiIsPresentationContainer(...args),
}));

describe('createAddServiceMapPanelAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected static action metadata', () => {
    const action = createAddServiceMapPanelAction();

    expect(action.id).toBe(ADD_APM_SERVICE_MAP_PANEL_ACTION_ID);
    expect(action.order).toBe(25);
    expect(action.getIconType()).toBe('apps');
    expect(action.getDisplayName()).toBe('Service map');
  });

  it('is compatible when embeddable is a presentation container', async () => {
    const embeddable = {};
    mockApiIsPresentationContainer.mockReturnValue(true);
    const action = createAddServiceMapPanelAction();

    await expect(action.isCompatible({ embeddable })).resolves.toBe(true);
    expect(mockApiIsPresentationContainer).toHaveBeenCalledWith(embeddable);
  });

  it('is not compatible when embeddable is not a presentation container', async () => {
    mockApiIsPresentationContainer.mockReturnValue(false);
    const action = createAddServiceMapPanelAction();

    await expect(action.isCompatible({ embeddable: {} })).resolves.toBe(false);
  });

  it('adds a new panel with the default serialized state', async () => {
    const addNewPanel = jest.fn();
    const embeddable = { addNewPanel };
    mockApiIsPresentationContainer.mockReturnValue(true);
    const action = createAddServiceMapPanelAction();

    await action.execute({ embeddable } as never);

    expect(addNewPanel).toHaveBeenCalledWith(
      {
        panelType: APM_SERVICE_MAP_EMBEDDABLE,
        serializedState: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
        },
      },
      { displaySuccessMessage: true }
    );
  });

  it('throws IncompatibleActionError when executing against non-container embeddable', async () => {
    mockApiIsPresentationContainer.mockReturnValue(false);
    const action = createAddServiceMapPanelAction();

    await expect(action.execute({ embeddable: {} } as never)).rejects.toBeInstanceOf(
      IncompatibleActionError
    );
  });
});
