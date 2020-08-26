/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appendSearch } from './helpers';

export const getCaseUrl = (search: string | null) => `${appendSearch(search ?? undefined)}`;

export const getCaseDetailsUrl = ({ id, search }: { id: string; search?: string | null }) =>
  `/${encodeURIComponent(id)}${appendSearch(search ?? undefined)}`;

export const getCreateCaseUrl = (search?: string | null) =>
  `/create${appendSearch(search ?? undefined)}`;

export const getConfigureCasesUrl = (search?: string) =>
  `/configure${appendSearch(search ?? undefined)}`;
