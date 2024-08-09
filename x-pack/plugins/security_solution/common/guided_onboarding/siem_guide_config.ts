/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding';
import * as i18n from './translations';

export const siemGuideId = 'siem';

export const defaultGuideTranslations = {
  title: i18n.TITLE,
  description: i18n.DESCRIPTION,
  docs: i18n.DOCS,
  steps: {
    add_data: {
      title: i18n.ADD_DATA_TITLE,
      description: i18n.ADD_DATA_DESCRIPTION,
    },
    rules: {
      title: i18n.RULES_TITLE,
      description: i18n.RULES_DESCRIPTION,
      manualCompletion: {
        title: i18n.RULES_MANUAL_TITLE,
        description: i18n.RULES_MANUAL_DESCRIPTION,
      },
    },
    alertsCases: {
      title: i18n.CASES_TITLE,
      description: i18n.CASES_DESCRIPTION,
      manualCompletion: {
        title: i18n.CASES_MANUAL_TITLE,
        description: i18n.CASES_MANUAL_DESCRIPTION,
      },
    },
  },
};

export const getSiemGuideConfig = (): GuideConfig => ({
  // check each launchDarkly property in case data is misformatted
  title: defaultGuideTranslations.title,
  guideName: 'Security',
  telemetryId: siemGuideId,
  completedGuideRedirectLocation: {
    appID: 'securitySolutionUI',
    path: '/dashboards',
  },
  description: defaultGuideTranslations.description,
  docs: {
    text: defaultGuideTranslations.docs,
    url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
  },
  steps: [
    {
      id: 'add_data',
      title: defaultGuideTranslations.steps.add_data.title,
      description: {
        descriptionText: defaultGuideTranslations.steps.add_data.description,
        linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
        isLinkExternal: true,
        linkText: i18n.LINK_TEXT,
      },
      integration: 'endpoint',
      location: {
        appID: 'integrations',
        path: '/detail/endpoint/overview',
      },
    },
    {
      id: 'rules',
      title: defaultGuideTranslations.steps.rules.title,
      description: defaultGuideTranslations.steps.rules.description,
      manualCompletion: {
        title: defaultGuideTranslations.steps.rules.manualCompletion.title,
        description: defaultGuideTranslations.steps.rules.manualCompletion.description,
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: defaultGuideTranslations.steps.alertsCases.title,
      description: defaultGuideTranslations.steps.alertsCases.description,
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
      manualCompletion: {
        title: defaultGuideTranslations.steps.alertsCases.manualCompletion.title,
        description: defaultGuideTranslations.steps.alertsCases.manualCompletion.description,
      },
    },
  ],
});
