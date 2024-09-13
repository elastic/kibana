/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import { FieldOption } from '../types';

const DATA_API_ROOT = '/internal/triggers_actions_ui/data';

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
    // prepend and append index search requests with `*` to match the given text in middle of index names
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
}): Promise<FieldOption[]> {
  const { fields } = await http.post<{ fields: ReturnType<typeof getESIndexFields> }>(
    `${DATA_API_ROOT}/_fields`,
    { body: JSON.stringify({ indexPatterns: indexes }) }
  );
  return fields;
}

type DataViewsService = Pick<DataViewsContract, 'find'>;
let dataViewsService: DataViewsService;

export const setDataViewsService = (aDataViewsService: DataViewsService) => {
  dataViewsService = aDataViewsService;
};

export const getDataViewsService = () => {
  return dataViewsService;
};

export const loadIndexPatterns = async (pattern: string) => {
  const formattedPattern = formatPattern(pattern);
  const perPage = 1000;

  try {
    const dataViews: DataView[] = await getDataViewsService().find(formattedPattern, perPage);

    return dataViews.map((dataView: DataView) => dataView.title);
  } catch (e) {
    return [];
  }
};
