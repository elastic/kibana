/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { Repository, EmptyRepository } from '../../../../common/types';
import { MINIMUM_TIMEOUT_MS } from '../../constants';
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
  });
};

export const editRepository = async (editedRepository: Repository | EmptyRepository) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${encodeURIComponent(editedRepository.name)}`
    ),
    method: 'put',
    body: editedRepository,
  });
};

export const deleteRepositories = async (names: Array<Repository['name']>) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${names.map(name => encodeURIComponent(name)).join(',')}`
    ),
    method: 'delete',
  });
};
