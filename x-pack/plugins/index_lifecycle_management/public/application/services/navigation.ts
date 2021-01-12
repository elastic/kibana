/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
