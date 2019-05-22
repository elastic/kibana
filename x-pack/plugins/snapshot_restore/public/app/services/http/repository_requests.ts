/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { Repository, EmptyRepository } from '../../../../common/types';
import {
  MINIMUM_TIMEOUT_MS,
  UIM_REPOSITORY_CREATE,
  UIM_REPOSITORY_UPDATE,
  UIM_REPOSITORY_DELETE,
  UIM_REPOSITORY_DELETE_MANY,
  UIM_REPOSITORY_DETAIL_PANEL_VERIFY,
} from '../../constants';
import { httpService } from './http';
import { sendRequest, useRequest } from './use_request';

export const loadRepositories = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories`),
    method: 'get',
    initialData: [],
    timeout: MINIMUM_TIMEOUT_MS,
  });
};

export const loadRepository = (name: Repository['name']) => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories/${encodeURIComponent(name)}`),
    method: 'get',
  });
};

export const verifyRepository = (name: Repository['name']) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${encodeURIComponent(name)}/verify`
    ),
    method: 'get',
    uimActionType: UIM_REPOSITORY_DETAIL_PANEL_VERIFY,
  });
};

export const loadRepositoryTypes = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repository_types`),
    method: 'get',
    initialData: [],
  });
};

export const addRepository = async (newRepository: Repository | EmptyRepository) => {
  return sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories`),
    method: 'put',
    body: newRepository,
    uimActionType: UIM_REPOSITORY_CREATE,
  });
};

export const editRepository = async (editedRepository: Repository | EmptyRepository) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${encodeURIComponent(editedRepository.name)}`
    ),
    method: 'put',
    body: editedRepository,
    uimActionType: UIM_REPOSITORY_UPDATE,
  });
};

export const deleteRepositories = async (names: Array<Repository['name']>) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${names.map(name => encodeURIComponent(name)).join(',')}`
    ),
    method: 'delete',
    uimActionType: names.length > 1 ? UIM_REPOSITORY_DELETE_MANY : UIM_REPOSITORY_DELETE,
  });
};
