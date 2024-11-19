/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
  SavedServiceGroup,
  ServiceGroup,
} from '../../../common/service_groups';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  serviceGroupId?: string;
  serviceGroup: ServiceGroup;
}
export async function saveServiceGroup({
  savedObjectsClient,
  serviceGroupId,
  serviceGroup,
}: Options): Promise<SavedServiceGroup> {
  const {
    id,
    attributes,
    updated_at: updatedAt,
  } = await (serviceGroupId
    ? savedObjectsClient.update(APM_SERVICE_GROUP_SAVED_OBJECT_TYPE, serviceGroupId, serviceGroup)
    : savedObjectsClient.create(APM_SERVICE_GROUP_SAVED_OBJECT_TYPE, serviceGroup));
  return {
    id,
    ...(attributes as ServiceGroup),
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
