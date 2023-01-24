/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { advancedSettingsMock } from '@kbn/advanced-settings-plugin/public/mocks';

import { AdvancedSettingsService } from './advanced_settings_service';

const componentRegistryMock = advancedSettingsMock.createSetupContract();

describe('Advanced Settings Service', () => {
  describe('#setup', () => {
    it('registers space-aware components to augment the advanced settings screen', () => {
      const deps = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'foo', name: 'foo-space' }),
        componentRegistry: componentRegistryMock.component,
      };

      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup(deps);

      expect(deps.componentRegistry.register).toHaveBeenCalledTimes(2);
      expect(deps.componentRegistry.register).toHaveBeenCalledWith(
        componentRegistryMock.component.componentType.PAGE_TITLE_COMPONENT,
        expect.any(Function),
        true
      );

      expect(deps.componentRegistry.register).toHaveBeenCalledWith(
        componentRegistryMock.component.componentType.PAGE_SUBTITLE_COMPONENT,
        expect.any(Function),
        true
      );
    });
  });
});
