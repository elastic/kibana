/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { INTERNAL_IDENTIFIER } from '../../../../common/constants';
import { findRules } from '../rules/find_rules';

export interface TagType {
  id: string;
  tags: string[];
}

export const isTags = (obj: object): obj is TagType => {
  return has('tags', obj);
};

export const convertToTags = (tagObjects: object[]): string[] => {
  const tags = tagObjects.reduce<string[]>((accum, tagObj) => {
    if (isTags(tagObj)) {
      return [...accum, ...tagObj.tags];
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
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<string[]> => {
  const tags = await readRawTags({ rulesClient });
  return tags.filter((tag) => !tag.startsWith(INTERNAL_IDENTIFIER));
};

export const readRawTags = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
  perPage?: number;
}): Promise<string[]> => {
  // Get just one record so we can get the total count
  const firstTags = await findRules({
    rulesClient,
    fields: ['tags'],
    perPage: 1,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
    filter: undefined,
  });
  // Get all the rules to aggregate over all the tags of the rules
  const rules = await findRules({
    rulesClient,
    fields: ['tags'],
    perPage: firstTags.total,
    sortField: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    filter: undefined,
  });
  const tagSet = convertTagsToSet(rules.data);
  return Array.from(tagSet);
};
