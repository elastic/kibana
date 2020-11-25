/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';

const DATA_API_ROOT = '/api/triggers_actions_ui/data';

export async function getMatchingIndices({
  pattern,
  http,
}: {
  pattern: string;
  http: HttpSetup;
}): Promise<Record<string, any>> {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const { indices } = await http.post(`${DATA_API_ROOT}/_indices`, {
    body: JSON.stringify({ pattern }),
  });
  return indices;
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
  const { fields } = await http.post(`${DATA_API_ROOT}/_fields`, {
    body: JSON.stringify({ indexPatterns: indexes }),
  });
  return fields;
}

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};
