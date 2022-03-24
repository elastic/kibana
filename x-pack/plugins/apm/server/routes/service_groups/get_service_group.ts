/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  ServiceGroup,
  SavedServiceGroup,
  APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
} from '../../../common/service_groups';

export async function getServiceGroup({
  savedObjectsClient,
  serviceGroupId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  serviceGroupId: string;
}): Promise<SavedServiceGroup> {
  const {
    id,
    updated_at: updatedAt,
    attributes,
  } = await savedObjectsClient.get<ServiceGroup>(
    APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
    serviceGroupId
  );
  return {
    id,
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
    ...attributes,
  };
}
