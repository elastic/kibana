/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store';

import type { StartServices } from '../../../types';
import { createFilterLensAction } from './create_action';

export const ACTION_ID = 'embeddable_filterIn';

export const createFilterInLensAction = ({
  store,
  order,
  services,
}: {
  store: SecurityAppStore;
  order: number;
  services: StartServices;
}) =>
  createFilterLensAction({
    id: ACTION_ID,
    order,
    store,
    services,
  });
