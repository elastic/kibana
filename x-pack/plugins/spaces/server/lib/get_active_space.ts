/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from './errors';
import { getSpaceIdFromPath } from './spaces_url_parser';

export async function getActiveSpace(
  savedObjectsClient: any,
  requestBasePath: string,
  serverBasePath: string
) {
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
  };
}

async function getSpaceById(savedObjectsClient: any, spaceId: string) {
  return savedObjectsClient.get('space', spaceId);
}
