/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { NavigationLink } from '@kbn/security-solution-plugin/public';

export interface ProjectNavigationLink extends NavigationLink {
  // The appId for external links
  appId?: string;
}

export type ProjectNavLinks = Observable<ProjectNavigationLink[]>;
