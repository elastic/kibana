/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsIndexExist } from '../types';

export const isIndexExist: IsIndexExist = async ({ services, index }) => {
  const isAssetCriticalityIndexExist =
    await services.scopedClusterClient.asInternalUser.indices.exists({
      index,
    });

  return isAssetCriticalityIndexExist;
};
