/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as TEXT from './translations';
import type { CspNavigationItem } from './types';

export const CSP_FINDINGS_PATH = '/findings';
export const CSP_DASHBOARD_PATH = '/dashboard';

type NavigableScreens = 'dashboard' | 'findings';

export const allNavigationItems: Record<NavigableScreens, CspNavigationItem> = {
  dashboard: { name: TEXT.DASHBOARD, path: CSP_DASHBOARD_PATH },
  findings: { name: TEXT.FINDINGS, path: CSP_FINDINGS_PATH },
};
