/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendSearch } from './helpers';

export const getAppOverviewUrl = (overviewPath: string, search?: string) =>
  `${overviewPath}${appendSearch(search)}`;
