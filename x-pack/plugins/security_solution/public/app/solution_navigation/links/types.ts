/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import type { Observable } from 'rxjs';
// import type {
//   SecurityPageName,
//   NavigationLink,
//   LinkCategory,
// } from '@kbn/security-solution-navigation';
import type { CloudStart } from '@kbn/cloud-plugin/public';
// import type { ExternalPageName } from './constants';

// export type SolutionPageName = SecurityPageName | ExternalPageName | 'root';

// export type SolutionNavigationLink = NavigationLink<SolutionPageName>;
// export type SolutionLinkCategory = LinkCategory<SolutionPageName>;
// export type SolutionNavLinks = Observable<SolutionNavigationLink[]>;

export type GetCloudUrl = (cloudUrlKey: string, cloud: CloudStart) => string | undefined;
