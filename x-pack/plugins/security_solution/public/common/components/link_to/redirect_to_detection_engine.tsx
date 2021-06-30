/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendSearch } from './helpers';

export const getDetectionEngineUrl = (search?: string) => `${appendSearch(search)}`;

export const getRulesUrl = (search?: string) => `${appendSearch(search)}`;

export const getCreateRuleUrl = (search?: string) => `/create${appendSearch(search)}`;

export const getRuleDetailsUrl = (detailName: string, search?: string) =>
  `/id/${detailName}${appendSearch(search)}`;

export const getEditRuleUrl = (detailName: string, search?: string) =>
  `/id/${detailName}/edit${appendSearch(search)}`;
