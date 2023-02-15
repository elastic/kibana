/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSecuritySolutionLink } from '@kbn/cloud-defend-plugin/public';
import { i18n } from '@kbn/i18n';
import { SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import type { LinkCategories, LinkItem } from '../common/links/types';
import { IconExceptionLists } from '../management/icons/exception_lists';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  capabilities: [`${SERVER_APP_ID}.show`],
};

export const rootLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('policies'),
  globalNavPosition: 3,
  ...commonLinkProperties,
};

export const manageLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('policies'),
  description: i18n.translate('xpack.securitySolution.appLinks.cloudDefendPoliciesDescription', {
    defaultMessage: 'View control policies.',
  }),
  landingIcon: IconExceptionLists,
  ...commonLinkProperties,
};

export const manageCategories: LinkCategories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.cloudDefend', {
      defaultMessage: 'DEFEND FOR CONTAINERS (D4C)',
    }),
    linkIds: [SecurityPageName.cloudDefendPolicies],
  },
];
