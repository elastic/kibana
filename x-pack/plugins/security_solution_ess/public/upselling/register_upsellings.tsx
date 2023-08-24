/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { UpsellingService } from '@kbn/security-solution-plugin/public';
import type {
  MessageUpsellings,
  PageUpsellings,
  SectionUpsellings,
  UpsellingMessageId,
  UpsellingSectionId,
} from '@kbn/security-solution-plugin/public/common/lib/upsellings/types';
import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { lazy } from 'react';
import type React from 'react';
import { UPGRADE_INVESTIGATION_GUIDE } from './messages/investigation_guide_upselling';
import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';
const EntityAnalyticsUpsellingLazy = lazy(() => import('./pages/entity_analytics_upselling'));

interface UpsellingsConfig {
  minimumLicenseRequired: LicenseType;
  component: React.ComponentType;
}

interface UpsellingsMessageConfig {
  minimumLicenseRequired: LicenseType;
  message: string;
  id: UpsellingMessageId;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;
type UpsellingMessages = UpsellingsMessageConfig[];

export const registerUpsellings = (
  upselling: UpsellingService,
  license: ILicense,
  services: Services
) => {
  const upsellingPagesToRegister = upsellingPages.reduce<PageUpsellings>(
    (pageUpsellings, { pageName, minimumLicenseRequired, component }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        pageUpsellings[pageName] = withServicesProvider(component, services);
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSectionsToRegister = upsellingSections.reduce<SectionUpsellings>(
    (sectionUpsellings, { id, minimumLicenseRequired, component }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        sectionUpsellings[id] = component;
      }
      return sectionUpsellings;
    },
    {}
  );

  const upsellingMessagesToRegister = upsellingMessages.reduce<MessageUpsellings>(
    (messagesUpsellings, { id, minimumLicenseRequired, message }) => {
      if (!license.hasAtLeast(minimumLicenseRequired)) {
        messagesUpsellings[id] = message;
      }
      return messagesUpsellings;
    },
    {}
  );

  upselling.setPages(upsellingPagesToRegister);
  upselling.setSections(upsellingSectionsToRegister);
  upselling.setMessages(upsellingMessagesToRegister);
};

// Upsellings for entire pages, linked to a SecurityPageName
export const upsellingPages: UpsellingPages = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    pageName: SecurityPageName.entityAnalytics,
    minimumLicenseRequired: 'platinum',
    component: EntityAnalyticsUpsellingLazy,
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingSections: UpsellingSections = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingMessages: UpsellingMessages = [
  {
    id: 'investigation_guide',
    minimumLicenseRequired: 'platinum',
    message: UPGRADE_INVESTIGATION_GUIDE('platinum'),
  },
];
