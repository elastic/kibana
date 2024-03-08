/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsBadge, cloudBadge, edrBadge, getProductBadges } from './badge';
import { ProductLine } from './configs';

describe('getProductBadges', () => {
  test('should return all badges if no productLineRequired is passed', () => {
    expect(getProductBadges()).toEqual([analyticsBadge, cloudBadge, edrBadge]);
  });

  test('should return only the badges for the productLineRequired passed', () => {
    expect(getProductBadges([ProductLine.cloud])).toEqual([cloudBadge]);
  });
});
