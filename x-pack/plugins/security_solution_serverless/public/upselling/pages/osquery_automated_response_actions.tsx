/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

// will be replaced with a proper osquery section component when we get the mocks
export const OsqueryResponseActionsUpsellingSectionlLazy = lazy(
  () => import('./generic_upselling_section')
);
