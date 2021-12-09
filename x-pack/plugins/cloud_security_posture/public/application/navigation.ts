/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSP_FINDINGS_PATH, CSP_DASHBOARD_PATH } from '../common/constants';

export const navigationLinks = [
  { name: 'Dashboard', path: CSP_DASHBOARD_PATH },
  { name: 'Findings', path: CSP_FINDINGS_PATH },
] as const;
