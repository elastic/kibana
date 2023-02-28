/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSecuritySolutionLink } from '@kbn/cloud-defend-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SecurityPageName } from '../../common/constants';
import { SERVER_APP_ID } from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { IconCloudDefend } from '../management/icons/cloud_defend';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  capabilities: [`${SERVER_APP_ID}.show`],
};

export const manageLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('policies'),
  description: i18n.translate('xpack.securitySolution.appLinks.cloudDefendPoliciesDescription', {
    defaultMessage: 'View drift prevention policies.',
  }),
  landingIcon: IconCloudDefend,
  ...commonLinkProperties,
};
