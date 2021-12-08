/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBasePath, isIntegrationsPopupOpen } from './index';
import { mockState } from '../../lib/__mocks__/uptime_store.mock';

describe('state selectors', () => {
  it('selects base path from state', () => {
    expect(getBasePath(mockState)).toBe('yyz');
  });

  it('gets integrations popup state', () => {
    const integrationsPopupOpen = {
      id: 'popup-id',
      open: true,
    };
    const state = {
      ...mockState,
      ui: {
        ...mockState.ui,
        integrationsPopoverOpen: integrationsPopupOpen,
      },
    };
    expect(isIntegrationsPopupOpen(state)).toBe(integrationsPopupOpen);
  });
});
