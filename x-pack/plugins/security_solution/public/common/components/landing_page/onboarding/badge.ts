/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductLine } from './configs';
import { PRODUCT_BADGE_ANALYTICS, PRODUCT_BADGE_CLOUD, PRODUCT_BADGE_EDR } from './translations';
import type { Badge } from './types';
import { BadgeId } from './types';

export const analyticsBadge: Badge = {
  id: BadgeId.analytics,
  name: PRODUCT_BADGE_ANALYTICS,
};

export const cloudBadge: Badge = {
  id: BadgeId.cloud,
  name: PRODUCT_BADGE_CLOUD,
};

export const edrBadge: Badge = {
  id: BadgeId.edr,
  name: PRODUCT_BADGE_EDR,
};

const productBadges: Record<ProductLine, Badge> = {
  [ProductLine.security]: analyticsBadge,
  [ProductLine.cloud]: cloudBadge,
  [ProductLine.endpoint]: edrBadge,
};

export const getProductBadges = (productLineRequired?: ProductLine[] | undefined): Badge[] =>
  (productLineRequired ?? [ProductLine.security, ProductLine.cloud, ProductLine.endpoint]).map(
    (product) => productBadges[product]
  );
