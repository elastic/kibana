/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from './errors';
import { getSpaceUrlContext } from '../../common/spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';

export async function getActiveSpace(savedObjectsClient, basePath) {
  const spaceContext = getSpaceUrlContext(basePath);

  let space;

  try {
    if (spaceContext) {
      space = await getSpaceByUrlContext(savedObjectsClient, spaceContext);
    } else {
      space = await getDefaultSpace(savedObjectsClient);
    }
  }
  catch (e) {
    throw wrapError(e);
  }

  if (!space) {
    throw Boom.notFound(
      `The Space you requested could not be found. Please select a different Space to continue.`
    );
  }

  return {
    id: space.id,
    ...space.attributes
  };
}

async function getDefaultSpace(savedObjectsClient) {
  return savedObjectsClient.get('space', DEFAULT_SPACE_ID);
}

async function getSpaceByUrlContext(savedObjectsClient, urlContext) {
  const {
    saved_objects: savedObjects
  } = await savedObjectsClient.find({
    type: 'space',
    search: `"${urlContext}"`,
    search_fields: ['urlContext'],
  });

  if (savedObjects.length === 0) {
    return null;
  }

  if (savedObjects.length > 1) {
    const spaceNames = savedObjects.map(s => s.attributes.name).join(', ');

    throw Boom.badRequest(
      `Multiple Spaces share this URL Context: (${spaceNames}). Please correct this in the Management Section.`
    );
  }

  return savedObjects[0];
}
