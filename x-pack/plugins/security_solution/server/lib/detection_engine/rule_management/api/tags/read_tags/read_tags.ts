/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import type { RulesClient } from '@kbn/alerting-plugin/server';

export interface TagType {
  id: string;
  tags: string[];
}

export const isTags = (obj: object): obj is TagType => {
  return has('tags', obj);
};

export const convertToTags = (tagObjects: object[]): string[] => {
  const tags = tagObjects.reduce<string[]>((acc, tagObj) => {
    if (isTags(tagObj)) {
      return [...acc, ...tagObj.tags];
    } else {
      return acc;
    }
  }, []);
  return tags;
};

export const convertTagsToSet = (tagObjects: object[]): Set<string> => {
  return new Set(convertToTags(tagObjects));
};

// This is a contrived max limit on the number of tags. In fact it can exceed this number and will be truncated to the hardcoded number.
const EXPECTED_MAX_TAGS = 500;

export const readTags = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
  perPage?: number;
}): Promise<string[]> => {
  const res = await rulesClient.aggregate({
    options: {
      fields: ['tags'],
      filter: undefined,
      maxTags: EXPECTED_MAX_TAGS,
    },
  });

  return res.ruleTags ?? [];
};
