/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTS_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Alerts"]';

export const CASES_PAGE = '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Cases"]';

export const HOSTS_PAGE = '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Hosts"]';

export const KIBANA_NAVIGATION_TOGGLE = '[data-test-subj="toggleNavButton"]';

export const ENDPOINTS_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Endpoints"]';

export const NETWORK_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Network"]';

export const OVERVIEW_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Overview"]';

export const TIMELINES_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Timelines"]';

export const SPACES_BUTTON = '[data-test-subj="spacesNavSelector"]';

export const getGoToSpaceMenuItem = (space: string) => `[data-test-subj="${space}-gotoSpace"]`;
