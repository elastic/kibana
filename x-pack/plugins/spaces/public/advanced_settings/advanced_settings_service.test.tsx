/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedSettingsService } from './advanced_settings_service';

describe('Advanced Settings Service', () => {
  describe('#setup', () => {
    it('registers space-aware components to augment the advanced settings screen', () => {
      const deps = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'foo', name: 'foo-space' }),
        registerSettingsComponent: jest.fn(),
      };

      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup(deps);

      expect(deps.registerSettingsComponent).toHaveBeenCalledTimes(2);
      expect(deps.registerSettingsComponent).toHaveBeenCalledWith(
        'advanced_settings_page_title',
        expect.any(Function),
        true
      );

      expect(deps.registerSettingsComponent).toHaveBeenCalledWith(
        'advanced_settings_page_subtitle',
        expect.any(Function),
        true
      );
    });
  });
});
