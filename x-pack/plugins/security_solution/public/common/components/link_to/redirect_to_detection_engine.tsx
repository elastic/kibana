/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appendSearch } from './helpers';

export const getDetectionEngineUrl = (search?: string) => `${appendSearch(search)}`;

export const getDetectionEngineTabUrl = (tabPath: string) => `/${tabPath}`;

export const getRulesUrl = () => '/rules';

export const getCreateRuleUrl = () => `/rules/create`;

export const getRuleDetailsUrl = (detailName: string) => `/rules/id/${detailName}`;

export const getEditRuleUrl = (detailName: string) => `/rules/id/${detailName}/edit`;
