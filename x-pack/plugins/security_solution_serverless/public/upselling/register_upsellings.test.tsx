/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpsellingService } from '@kbn/security-solution-plugin/public';
import { ALL_APP_FEATURE_KEYS } from '@kbn/security-solution-plugin/common';
import {
  registerUpsellings,
  upsellingMessages,
  upsellingPages,
  upsellingSections,
} from './register_upsellings';
import { ProductLine, ProductTier } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';

const mockGetProductAppFeatures = jest.fn();
jest.mock('../../common/pli/pli_features', () => ({
  getProductAppFeatures: () => mockGetProductAppFeatures(),
}));

const allProductTypes: SecurityProductTypes = [
  { product_line: ProductLine.security, product_tier: ProductTier.complete },
  { product_line: ProductLine.endpoint, product_tier: ProductTier.complete },
  { product_line: ProductLine.cloud, product_tier: ProductTier.complete },
];

describe('registerUpsellings', () => {
  it('should not register anything when all PLIs features are enabled', () => {
    mockGetProductAppFeatures.mockReturnValue(ALL_APP_FEATURE_KEYS);

    const registerPages = jest.fn();
    const registerSections = jest.fn();
    const registerMessages = jest.fn();
    const upselling = {
      registerPages,
      registerSections,
      registerMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes);

    expect(registerPages).toHaveBeenCalledTimes(1);
    expect(registerPages).toHaveBeenCalledWith({});

    expect(registerSections).toHaveBeenCalledTimes(1);
    expect(registerSections).toHaveBeenCalledWith({});

    expect(registerMessages).toHaveBeenCalledTimes(1);
    expect(registerMessages).toHaveBeenCalledWith({});
  });

  it('should register all upsellings pages, sections and messages when PLIs features are disabled', () => {
    mockGetProductAppFeatures.mockReturnValue([]);

    const registerPages = jest.fn();
    const registerSections = jest.fn();
    const registerMessages = jest.fn();

    const upselling = {
      registerPages,
      registerSections,
      registerMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes);

    const expectedPagesObject = Object.fromEntries(
      upsellingPages.map(({ pageName }) => [pageName, expect.any(Object)])
    );
    expect(registerPages).toHaveBeenCalledTimes(1);
    expect(registerPages).toHaveBeenCalledWith(expectedPagesObject);

    const expectedSectionsObject = Object.fromEntries(
      upsellingSections.map(({ id }) => [id, expect.any(Object)])
    );
    expect(registerSections).toHaveBeenCalledTimes(1);
    expect(registerSections).toHaveBeenCalledWith(expectedSectionsObject);

    const expectedMessagesObject = Object.fromEntries(
      upsellingMessages.map(({ id }) => [id, expect.any(String)])
    );
    expect(registerMessages).toHaveBeenCalledTimes(1);
    expect(registerMessages).toHaveBeenCalledWith(expectedMessagesObject);
  });
});
