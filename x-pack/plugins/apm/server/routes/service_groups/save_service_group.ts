/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
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
}: Options) {
  // update existing service group
  if (serviceGroupId) {
    return await savedObjectsClient.update(
      APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
      serviceGroupId,
      serviceGroup
    );
  }

  // create new saved object
  return await savedObjectsClient.create(
    APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
    serviceGroup
  );
}
