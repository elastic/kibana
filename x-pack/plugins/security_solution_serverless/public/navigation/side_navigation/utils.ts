/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { ExternalPageName } from '../links/constants';
import type { ProjectPageName } from '../links/types';

// We need to hide breadcrumbs for some pages (tabs) because they appear duplicated.
// These breadcrumbs are incorrectly processed as trailing breadcrumbs in SecuritySolution, because of `SpyRoute` architecture limitations.
// They are navLinks tree with a SecurityPageName, so they should be treated as leading breadcrumbs in ESS as well.
// TODO: Improve the breadcrumbs logic in `use_breadcrumbs_nav` to avoid this workaround.
const HIDDEN_BREADCRUMBS = new Set<ProjectPageName>([
  SecurityPageName.networkFlows,
  SecurityPageName.networkDns,
  SecurityPageName.networkHttp,
  SecurityPageName.networkTls,
  SecurityPageName.networkAnomalies,
  SecurityPageName.networkEvents,
  SecurityPageName.usersAll,
  SecurityPageName.usersAuthentications,
  SecurityPageName.usersAnomalies,
  SecurityPageName.usersRisk,
  SecurityPageName.usersEvents,
  SecurityPageName.hostsAll,
  SecurityPageName.hostsUncommonProcesses,
  SecurityPageName.hostsAnomalies,
  SecurityPageName.hostsEvents,
  SecurityPageName.hostsRisk,
  SecurityPageName.hostsSessions,
]);

export const isBreadcrumbHidden = (id: ProjectPageName): boolean =>
  HIDDEN_BREADCRUMBS.has(id) ||
  /* management sub-pages set their breadcrumbs themselves, the main Management breadcrumb is configured with our navigationTree definition */
  (id.startsWith(ExternalPageName.management) && id !== ExternalPageName.management);
