/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInitFlyoutsFromUrlParam } from './use_init_flyouts_url_params';
import { useSyncFlyoutsUrlParam } from './use_sync_flyouts_url_params';

export const useFlyoutsUrlStateSync = () => {
  useInitFlyoutsFromUrlParam();
  useSyncFlyoutsUrlParam();
};
