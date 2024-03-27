/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { APM_SERVICE_GROUP_SAVED_OBJECT_TYPE } from '../../../common/service_groups';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  serviceGroupId: string;
}
export async function deleteServiceGroup({
  savedObjectsClient,
  serviceGroupId,
}: Options) {
  return savedObjectsClient.delete(
    APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
    serviceGroupId
  );
}
