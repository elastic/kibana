/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';

const DATA_API_ROOT = '/api/triggers_actions_ui/data';

const formatPattern = (pattern: string) => {
  let formattedPattern = pattern;
  if (!formattedPattern.startsWith('*')) {
    formattedPattern = `*${formattedPattern}`;
  }
  if (!formattedPattern.endsWith('*')) {
    formattedPattern = `${formattedPattern}*`;
  }
  return formattedPattern;
};

export async function getMatchingIndices({
  pattern,
  http,
}: {
  pattern: string;
  http: HttpSetup;
}): Promise<Record<string, any>> {
  try {
    const formattedPattern = formatPattern(pattern);

    const { indices } = await http.post<ReturnType<typeof getMatchingIndices>>(
      `${DATA_API_ROOT}/_indices`,
      { body: JSON.stringify({ pattern: formattedPattern }) }
    );
    return indices;
  } catch (e) {
    return [];
  }
}

export async function getESIndexFields({
  indexes,
  http,
}: {
  indexes: string[];
  http: HttpSetup;
}): Promise<
  Array<{
    name: string;
    type: string;
    normalizedType: string;
    searchable: boolean;
    aggregatable: boolean;
  }>
> {
  const { fields } = await http.post<{ fields: ReturnType<typeof getESIndexFields> }>(
    `${DATA_API_ROOT}/_fields`,
    { body: JSON.stringify({ indexPatterns: indexes }) }
  );
  return fields;
}

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

export const loadIndexPatterns = async (pattern: string) => {
  let allSavedObjects = [];
  const formattedPattern = formatPattern(pattern);
  const perPage = 1000;

  try {
    const { savedObjects, total } = await getSavedObjectsClient().find({
      type: 'index-pattern',
      fields: ['title'],
      page: 1,
      search: formattedPattern,
      perPage,
    });

    allSavedObjects = savedObjects;

    if (total > perPage) {
      let currentPage = 2;
      const numberOfPages = Math.ceil(total / perPage);
      const promises = [];

      while (currentPage <= numberOfPages) {
        promises.push(
          getSavedObjectsClient().find({
            type: 'index-pattern',
            page: currentPage,
            fields: ['title'],
            search: formattedPattern,
            perPage,
          })
        );
        currentPage++;
      }

      const paginatedResults = await Promise.all(promises);

      allSavedObjects = paginatedResults.reduce((oldResult, result) => {
        return oldResult.concat(result.savedObjects);
      }, allSavedObjects);
    }
    return allSavedObjects.map((indexPattern: any) => indexPattern.attributes.title);
  } catch (e) {
    return [];
  }
};
