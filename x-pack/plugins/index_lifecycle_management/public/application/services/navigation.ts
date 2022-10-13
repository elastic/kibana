/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from '@kbn/core/public';
import { getIndexListUri } from '@kbn/index-management-plugin/public';

export const ROUTES = {
  list: '/policies',
  edit: '/policies/edit/:policyName?',
  create: '/policies/edit',
};

export const getPolicyEditPath = (policyName: string): string => {
  return encodeURI(`/policies/edit/${encodeURIComponent(policyName)}`);
};

export const getPolicyCreatePath = () => {
  return ROUTES.create;
};

export const getPoliciesListPath = () => {
  return ROUTES.list;
};

export const getIndicesListPath = (
  policyName: string,
  getUrlForApp: ApplicationStart['getUrlForApp']
) =>
  getUrlForApp('management', {
    path: `/data/index_management${getIndexListUri(`ilm.policy="${policyName}"`, true)}`,
  });
