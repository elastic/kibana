/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { ProjectPageName } from '../links/types';

// We need to hide breadcrumbs for some pages (tabs) because they appear duplicated.
// These breadcrumbs are incorrectly processed as trailing breadcrumbs in SecuritySolution, because of `SpyRoute` architecture limitations.
// They are navLinks tree with a SecurityPageName, so they should be treated as leading breadcrumbs in ESS as well.
// TODO: Improve the breadcrumbs logic in `use_breadcrumbs_nav` to avoid this workaround.
const HIDDEN_BREADCRUMBS = new Set<ProjectPageName>([
  SecurityPageName.networkDns,
  SecurityPageName.networkHttp,
  SecurityPageName.networkTls,
  SecurityPageName.networkAnomalies,
  SecurityPageName.networkEvents,
  SecurityPageName.usersAuthentications,
  SecurityPageName.usersAnomalies,
  SecurityPageName.usersRisk,
  SecurityPageName.usersEvents,
  SecurityPageName.uncommonProcesses,
  SecurityPageName.hostsAnomalies,
  SecurityPageName.hostsEvents,
  SecurityPageName.hostsRisk,
  SecurityPageName.sessions,
]);

export const isBreadcrumbHidden = (id: ProjectPageName): boolean =>
  HIDDEN_BREADCRUMBS.has(id) ||
  (id.startsWith('management:') &&
    id !== 'management:'); /* management sub-pages set their breadcrumbs themselves */
