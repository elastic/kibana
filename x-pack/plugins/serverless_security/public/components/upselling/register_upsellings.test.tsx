/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpsellingService } from '@kbn/security-solution-plugin/public';
import { registerUpsellings } from './register_upsellings';

const mockGetProductAppFeatures = jest.fn();
jest.mock('../../../common/pli/pli_features', () => ({
  getProductAppFeatures: () => mockGetProductAppFeatures(),
}));

describe('registerUpsellings', () => {
  it('registers entity analytics upsellings page and section when PLIs features are disabled', () => {
    mockGetProductAppFeatures.mockReturnValue({}); // return empty object to simulate no features enabled

    const registerPages = jest.fn();
    const registerSections = jest.fn();
    const upselling = {
      registerPages,
      registerSections,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, ['securityEssentials', 'securityComplete']);

    expect(registerPages).toHaveBeenCalledTimes(1);
    expect(registerPages).toHaveBeenCalledWith(
      expect.objectContaining({
        ['entity-analytics']: expect.any(Function),
      })
    );

    expect(registerSections).toHaveBeenCalledTimes(1);
    expect(registerSections).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_analytics_panel: expect.any(Function),
      })
    );
  });
});
