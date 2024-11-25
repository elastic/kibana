/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CardSelectorListItem } from '../common/card_selector_list';
import type { CardAssetType } from '../types';

export enum DashboardsCardItemId {
  discover = 'discover',
}

export type DashboardsCardSelectorListItem = CardSelectorListItem & CardAssetType;
