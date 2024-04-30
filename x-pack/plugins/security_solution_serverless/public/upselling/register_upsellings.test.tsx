/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  registerUpsellings,
  upsellingMessages,
  upsellingPages,
  upsellingSections,
} from './register_upsellings';
import { ProductLine, ProductTier } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';
import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import { mockServices } from '../common/services/__mocks__/services.mock';

const mockGetProductProductFeatures = jest.fn();
jest.mock('../../common/pli/pli_features', () => ({
  getProductProductFeatures: () => mockGetProductProductFeatures(),
}));

const allProductTypes: SecurityProductTypes = [
  { product_line: ProductLine.security, product_tier: ProductTier.complete },
  { product_line: ProductLine.endpoint, product_tier: ProductTier.complete },
  { product_line: ProductLine.cloud, product_tier: ProductTier.complete },
];

describe('registerUpsellings', () => {
  it('should not register anything when all PLIs features are enabled', () => {
    mockGetProductProductFeatures.mockReturnValue(ALL_PRODUCT_FEATURE_KEYS);

    const setPages = jest.fn();
    const setSections = jest.fn();
    const setMessages = jest.fn();
    const upselling = {
      setPages,
      setSections,
      setMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes, mockServices);

    expect(setPages).toHaveBeenCalledTimes(1);
    expect(setPages).toHaveBeenCalledWith({});

    expect(setSections).toHaveBeenCalledTimes(1);
    expect(setSections).toHaveBeenCalledWith({});

    expect(setMessages).toHaveBeenCalledTimes(1);
    expect(setMessages).toHaveBeenCalledWith({});
  });

  it('should register all upsellings pages, sections and messages when PLIs features are disabled', () => {
    mockGetProductProductFeatures.mockReturnValue([]);

    const setPages = jest.fn();
    const setSections = jest.fn();
    const setMessages = jest.fn();

    const upselling = {
      setPages,
      setSections,
      setMessages,
    } as unknown as UpsellingService;

    registerUpsellings(upselling, allProductTypes, mockServices);

    const expectedPagesObject = Object.fromEntries(
      upsellingPages.map(({ pageName }) => [pageName, expect.anything()])
    );
    expect(setPages).toHaveBeenCalledTimes(1);
    expect(setPages).toHaveBeenCalledWith(expectedPagesObject);

    const expectedSectionsObject = Object.fromEntries(
      upsellingSections.map(({ id }) => [id, expect.anything()])
    );
    expect(setSections).toHaveBeenCalledTimes(1);
    expect(setSections).toHaveBeenCalledWith(expectedSectionsObject);

    const expectedMessagesObject = Object.fromEntries(
      upsellingMessages.map(({ id }) => [id, expect.any(String)])
    );
    expect(setMessages).toHaveBeenCalledTimes(1);
    expect(setMessages).toHaveBeenCalledWith(expectedMessagesObject);
  });
});
