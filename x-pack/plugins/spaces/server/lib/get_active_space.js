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

  if (typeof spaceContext !== 'string') {
    return null;
  }

  let spaces;
  try {
    spaces = await getSpacesFromContext(savedObjectsClient, spaceContext);
  } catch (e) {
    throw wrapError(e);
  }

  if (spaces.length === 0) {
    throw Boom.notFound(
      `The Space you requested could not be found. Please select a different Space to continue.`
    );
  }

  if (spaces.length > 1) {
    const spaceNames = spaces.map(s => s.attributes.name).join(', ');

    throw Boom.badRequest(
      `Multiple Spaces share this URL Context: (${spaceNames}). Please correct this in the Management Section.`
    );
  }

  return {
    id: spaces[0].id,
    ...spaces[0].attributes
  };
}

async function getSpacesFromContext(client, context) {
  // Workaround for SOC's find operation, which can't "find" on an empty string.
  if (!context) {
    return [await client.get('space', DEFAULT_SPACE_ID)];
  }

  const {
    saved_objects: savedObjects
  } = await client.find({
    type: 'space',
    search: `"${context}"`,
    searchFields: ['urlContext'],
  });

  return savedObjects;
}
