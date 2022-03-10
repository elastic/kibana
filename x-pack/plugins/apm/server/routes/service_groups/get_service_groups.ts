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
  MAX_NUMBER_OF_SERVICES_IN_GROUP,
} from '../../../common/service_groups';

export async function getServiceGroups({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedServiceGroup[]> {
  const result = await savedObjectsClient.find<ServiceGroup>({
    type: APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: MAX_NUMBER_OF_SERVICES_IN_GROUP,
  });
  return result.saved_objects.map(
    ({ id, attributes, updated_at: upatedAt }) => ({
      id,
      updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
      ...attributes,
    })
  );
}
