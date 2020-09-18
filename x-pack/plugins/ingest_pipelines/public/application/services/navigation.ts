/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const BASE_PATH = '/';

const EDIT_PATH = 'edit';

const CREATE_PATH = 'create';

const getEditPath = (name: string, encode = true): string => {
  return `${BASE_PATH}${EDIT_PATH}/${encode ? encodeURIComponent(name) : name}`;
};

const getCreatePath = (): string => {
  return `${BASE_PATH}${CREATE_PATH}`;
};

const getClonePath = (name: string, encode = true): string => {
  return `${BASE_PATH}${CREATE_PATH}/${encode ? encodeURIComponent(name) : name}`;
};
const getListPath = (name?: string): string => {
  return `${BASE_PATH}${name ? `?pipeline=${encodeURIComponent(name)}` : ''}`;
};

export enum INGEST_PIPELINES_PAGES {
  LIST = 'pipelines_list',
  EDIT = 'pipeline_edit',
  CREATE = 'pipeline_create',
  CLONE = 'pipeline_clone',
}

export const ROUTES_CONFIG = {
  [INGEST_PIPELINES_PAGES.LIST]: getListPath(),
  [INGEST_PIPELINES_PAGES.EDIT]: getEditPath(':name', false),
  [INGEST_PIPELINES_PAGES.CREATE]: getCreatePath(),
  [INGEST_PIPELINES_PAGES.CLONE]: getClonePath(':sourceName', false),
};

export const URL_GENERATOR = {
  [INGEST_PIPELINES_PAGES.LIST]: (selectedPipelineName?: string) =>
    getListPath(selectedPipelineName),
  [INGEST_PIPELINES_PAGES.EDIT]: (pipelineName: string) => getEditPath(pipelineName, true),
  [INGEST_PIPELINES_PAGES.CREATE]: getCreatePath,
  [INGEST_PIPELINES_PAGES.CLONE]: (pipelineName: string) => getClonePath(pipelineName, true),
};
