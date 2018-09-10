/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Space } from '../../../common/model/space';
import { convertSavedObjectToSpace } from './convert_saved_object_to_space';

export async function getSpaceById(client: any, spaceId: string): Promise<Space | null> {
  try {
    const existingSpace = await client.get('space', spaceId);
    return convertSavedObjectToSpace(existingSpace);
  } catch (error) {
    if (client.errors.isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}
