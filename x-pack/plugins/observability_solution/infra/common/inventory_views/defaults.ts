/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NonEmptyString } from '@kbn/io-ts-utils';
import type { InventoryViewAttributes } from './types';

export const staticInventoryViewId = '0';

export const staticInventoryViewAttributes: InventoryViewAttributes = {
  name: i18n.translate('xpack.infra.savedView.defaultViewNameHosts', {
    defaultMessage: 'Default view',
  }) as NonEmptyString,
  isDefault: false,
  isStatic: true,
  metric: {
    type: 'cpuTotal',
  },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: [],
  boundsOverride: {
    max: 1,
    min: 0,
  },
  autoBounds: true,
  accountId: '',
  region: '',
  customMetrics: [],
  legend: {
    palette: 'cool',
    steps: 10,
    reverseColors: false,
  },
  source: 'default',
  sort: {
    by: 'name',
    direction: 'desc',
  },
  timelineOpen: false,
  filterQuery: {
    kind: 'kuery',
    expression: '',
  },
  autoReload: false,
};
