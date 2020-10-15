/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'kibana/server';

import { CaseAttributes } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../saved_object_types';

export const convertToTags = (tagObjects: Array<SavedObject<CaseAttributes>>): string[] =>
  tagObjects.reduce<string[]>((accum, tagObj) => {
    if (tagObj && tagObj.attributes && tagObj.attributes.tags) {
      return [...accum, ...tagObj.attributes.tags];
    } else {
      return accum;
    }
  }, []);

export const convertTagsToSet = (tagObjects: Array<SavedObject<CaseAttributes>>): Set<string> => {
  return new Set(convertToTags(tagObjects));
};

// Note: This is doing an in-memory aggregation of the tags by calling each of the case
// records in batches of this const setting and uses the fields to try to get the least
// amount of data per record back. If saved objects at some point supports aggregations
// then this should be replaced with a an aggregation call.
// Ref: https://www.elastic.co/guide/en/kibana/master/saved-objects-api.html
export const readTags = async ({
  client,
}: {
  client: SavedObjectsClientContract;
  perPage?: number;
}): Promise<string[]> => {
  const tags = await readRawTags({ client });
  return tags;
};

export const readRawTags = async ({
  client,
}: {
  client: SavedObjectsClientContract;
}): Promise<string[]> => {
  const firstTags = await client.find({
    type: CASE_SAVED_OBJECT,
    fields: ['tags'],
    page: 1,
    perPage: 1,
  });
  const tags = await client.find<CaseAttributes>({
    type: CASE_SAVED_OBJECT,
    fields: ['tags'],
    page: 1,
    perPage: firstTags.total,
  });

  return Array.from(convertTagsToSet(tags.saved_objects));
};
