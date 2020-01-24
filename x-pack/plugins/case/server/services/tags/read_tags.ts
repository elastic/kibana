/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import { SavedObjectsClientContract } from 'kibana/server';
import { CASE_SAVED_OBJECT } from '../../constants';

const DEFAULT_PER_PAGE: number = 1000;
interface TagAttr {
  tags: string[];
}
export interface TagType {
  id: string;
  attributes: TagAttr;
}

export const isTags = (obj: object): obj is TagType => {
  return has('attributes.tags', obj);
};

export const convertToTags = (tagObjects: object[]): string[] => {
  const tags = tagObjects.reduce<string[]>((accum, tagObj) => {
    if (isTags(tagObj)) {
      return [...accum, ...tagObj.attributes.tags];
    } else {
      return accum;
    }
  }, []);
  return tags;
};

export const convertTagsToSet = (tagObjects: object[]): Set<string> => {
  return new Set(convertToTags(tagObjects));
};

// Note: This is doing an in-memory aggregation of the tags by calling each of the alerting
// records in batches of this const setting and uses the fields to try to get the least
// amount of data per record back. If saved objects at some point supports aggregations
// then this should be replaced with a an aggregation call.
// Ref: https://www.elastic.co/guide/en/kibana/master/saved-objects-api.html
export const readTags = async ({
  client,
  perPage = DEFAULT_PER_PAGE,
}: {
  client: SavedObjectsClientContract;
  perPage?: number;
}): Promise<string[]> => {
  const tags = await readRawTags({ client, perPage });
  return tags;
};

export const readRawTags = async ({
  client,
  perPage = DEFAULT_PER_PAGE,
}: {
  client: SavedObjectsClientContract;
  perPage?: number;
}): Promise<string[]> => {
  const firstTags = await client.find({
    type: CASE_SAVED_OBJECT,
    fields: ['tags'],
    page: 1,
    perPage,
  });
  const firstSet = convertTagsToSet(firstTags.saved_objects);
  const totalPages = Math.ceil(firstTags.total / firstTags.per_page);
  if (totalPages <= 1) {
    return Array.from(firstSet);
  } else {
    const returnTags = await Array(totalPages - 1)
      .fill({})
      .map((_, page) => {
        // page index starts at 2 as we already got the first page and we have more pages to go
        return client.find({ type: CASE_SAVED_OBJECT, fields: ['tags'], perPage, page: page + 2 });
      })
      .reduce<Promise<Set<string>>>(async (accum, nextTagPage) => {
        const tagArray = convertToTags((await nextTagPage).saved_objects);
        return new Set([...(await accum), ...tagArray]);
      }, Promise.resolve(firstSet));

    return Array.from(returnTags);
  }
};
