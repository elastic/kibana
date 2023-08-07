/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SERVER_APP_ID } from '@kbn/security-solution-plugin/common';
import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { ExternalPageName, SecurityPagePath } from '../constants';
import type { ProjectNavigationLink } from '../types';
import { IconOsqueryLazy, IconTimelineLazy } from '../../../common/lazy_icons';
import * as i18n from './investigations_translations';

// appLinks configures the Security Solution pages links
const investigationsAppLink: LinkItem = {
  id: SecurityPageName.investigations,
  title: i18n.INVESTIGATIONS_TITLE,
  path: SecurityPagePath[SecurityPageName.investigations],
  capabilities: [`${SERVER_APP_ID}.show`],
  hideTimeline: true,
  skipUrlState: true,
  links: [], // timeline link are added in createInvestigationsLinkFromTimeline
};

export const createInvestigationsLinkFromTimeline = (timelineLink: LinkItem): LinkItem => {
  return {
    ...investigationsAppLink,
    links: [
      { ...timelineLink, description: i18n.TIMELINE_DESCRIPTION, landingIcon: IconTimelineLazy },
    ],
  };
};

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const investigationsNavLinks: ProjectNavigationLink[] = [
  {
    id: ExternalPageName.osquery,
    title: i18n.OSQUERY_TITLE,
    landingIcon: IconOsqueryLazy,
    description: i18n.OSQUERY_DESCRIPTION,
  },
];
