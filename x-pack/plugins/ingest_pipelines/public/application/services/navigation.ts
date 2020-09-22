/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const BASE_PATH = '/';

const EDIT_PATH = 'edit';

const CREATE_PATH = 'create';

const _getEditPath = (name: string, encode = true): string => {
  return `${BASE_PATH}${EDIT_PATH}/${encode ? encodeURIComponent(name) : name}`;
};

const _getCreatePath = (): string => {
  return `${BASE_PATH}${CREATE_PATH}`;
};

const _getClonePath = (name: string, encode = true): string => {
  return `${BASE_PATH}${CREATE_PATH}/${encode ? encodeURIComponent(name) : name}`;
};
const _getListPath = (name?: string): string => {
  return `${BASE_PATH}${name ? `?pipeline=${encodeURIComponent(name)}` : ''}`;
};

export const ROUTES = {
  list: _getListPath(),
  edit: _getEditPath(':name', false),
  create: _getCreatePath(),
  clone: _getClonePath(':sourceName', false),
};

export const getListPath = ({
  inspectedPipelineName,
}: {
  inspectedPipelineName?: string;
} = {}): string => _getListPath(inspectedPipelineName);
export const getEditPath = ({ pipelineName }: { pipelineName: string }): string =>
  _getEditPath(pipelineName, true);
export const getCreatePath = (): string => _getCreatePath();
export const getClonePath = ({ clonedPipelineName }: { clonedPipelineName: string }): string =>
  _getClonePath(clonedPipelineName, true);
