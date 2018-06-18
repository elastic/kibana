/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from './errors';
import { getSpaceUrlContext } from '../../common/spaces_url_parser';

export async function getSpaces(savedObjectsClient, basePath) {
  const spaceContext = getSpaceUrlContext(basePath);

  if (!spaceContext) {
    return null;
  }

  let spaces;
  try {
    const {
      saved_objects: savedObjects
    } = await savedObjectsClient.find({
      type: 'space'
    });

    spaces = savedObjects || [];
  } catch (e) {
    throw wrapError(e);
  }

  return spaces.map(s => ({
    id: s.id,
    ...s.attributes
  }));
}
