/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  SecurityPageName,
  NavigationLink,
  LinkCategory,
} from '@kbn/security-solution-navigation';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ExternalPageName } from './constants';

export type ProjectPageName = SecurityPageName | ExternalPageName | 'root';

export type ProjectNavigationLink = NavigationLink<ProjectPageName>;
export type ProjectLinkCategory = LinkCategory<ProjectPageName>;
export type ProjectNavLinks = Observable<ProjectNavigationLink[]>;
export type GetCloudUrl = (cloudUrlKey: string, cloud: CloudStart) => string | undefined;
