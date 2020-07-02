/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appendSearch } from './helpers';

export const getDetectionEngineUrl = (search?: string) => `${appendSearch(search)}`;

export const getDetectionEngineTabUrl = (tabPath: string, search?: string) =>
  `/${tabPath}${appendSearch(search)}`;

export const getRulesUrl = (search?: string) => `/rules${appendSearch(search)}`;

export const getCreateRuleUrl = (search?: string) => `/rules/create${appendSearch(search)}`;

export const getRuleDetailsUrl = (detailName: string, search?: string) =>
  `/rules/id/${detailName}${appendSearch(search)}`;

export const getEditRuleUrl = (detailName: string, search?: string) =>
  `/rules/id/${detailName}/edit${appendSearch(search)}`;
