/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../common/model/space';
import { wrapError } from './errors';
import { SavedObjectsClient } from './saved_objects_client/saved_objects_client_types';
import { getSpaceIdFromPath } from './spaces_url_parser';

export async function getActiveSpace(
  savedObjectsClient: SavedObjectsClient,
  requestBasePath: string,
  serverBasePath: string
): Promise<Space> {
  const spaceId = getSpaceIdFromPath(requestBasePath, serverBasePath);

  let space;

  try {
    space = await getSpaceById(savedObjectsClient, spaceId);
  } catch (e) {
    throw wrapError(e);
  }

  if (!space) {
    throw Boom.notFound(
      `The Space you requested could not be found. Please select a different Space to continue.`
    );
  }

  return {
    id: space.id,
    ...space.attributes,
  } as Space;
}

async function getSpaceById(savedObjectsClient: SavedObjectsClient, spaceId: string) {
  return savedObjectsClient.get('space', spaceId);
}
