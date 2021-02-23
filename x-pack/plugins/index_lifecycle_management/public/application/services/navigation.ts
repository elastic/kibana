/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PhasesExceptDelete } from '../../../common/types';

export const ROUTES = {
  list: '/policies',
  edit: '/policies/edit/:policyName?',
  rollupWizard: '/policies/:phase/rollup/edit',
  create: '/policies/edit',
};

export const getPolicyEditPath = (policyName: string): string => {
  return encodeURI(`/policies/edit/${encodeURIComponent(policyName)}`);
};

export const getPolicyRollupWizardPath = (phase: PhasesExceptDelete) => {
  return encodeURI(`/policies/${phase}/rollup/edit`);
};

export const getPolicyCreatePath = () => {
  return ROUTES.create;
};

export const getPoliciesListPath = () => {
  return ROUTES.list;
};
