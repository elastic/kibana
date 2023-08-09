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

    const setRegisteredPages = jest.fn();
    const setRegisteredSections = jest.fn();
    const setRegisteredMessages = jest.fn();
    const upselling = {
      setRegisteredPages,
      setRegisteredSections,
      setRegisteredMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes);

    expect(setRegisteredPages).toHaveBeenCalledTimes(1);
    expect(setRegisteredPages).toHaveBeenCalledWith({});

    expect(setRegisteredSections).toHaveBeenCalledTimes(1);
    expect(setRegisteredSections).toHaveBeenCalledWith({});

    expect(setRegisteredMessages).toHaveBeenCalledTimes(1);
    expect(setRegisteredMessages).toHaveBeenCalledWith({});
  });

  it('should register all upsellings pages, sections and messages when PLIs features are disabled', () => {
    mockGetProductAppFeatures.mockReturnValue([]);

    const setRegisteredPages = jest.fn();
    const setRegisteredSections = jest.fn();
    const setRegisteredMessages = jest.fn();

    const upselling = {
      setRegisteredPages,
      setRegisteredSections,
      setRegisteredMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes);

    const expectedPagesObject = Object.fromEntries(
      upsellingPages.map(({ pageName }) => [pageName, expect.anything()])
    );
    expect(setRegisteredPages).toHaveBeenCalledTimes(1);
    expect(setRegisteredPages).toHaveBeenCalledWith(expectedPagesObject);

    const expectedSectionsObject = Object.fromEntries(
      upsellingSections.map(({ id }) => [id, expect.anything()])
    );
    expect(setRegisteredSections).toHaveBeenCalledTimes(1);
    expect(setRegisteredSections).toHaveBeenCalledWith(expectedSectionsObject);

    const expectedMessagesObject = Object.fromEntries(
      upsellingMessages.map(({ id }) => [id, expect.any(String)])
    );
    expect(setRegisteredMessages).toHaveBeenCalledTimes(1);
    expect(setRegisteredMessages).toHaveBeenCalledWith(expectedMessagesObject);
  });
});
