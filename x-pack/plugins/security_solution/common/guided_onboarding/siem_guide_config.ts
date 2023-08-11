/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding';
import * as i18t from './translations';

export const siemGuideId = 'siem';

export const defaultGuideTranslations = {
  title: i18t.TITLE,
  description: i18t.DESCRIPTION,
  docs: i18t.DOCS,
  steps: {
    add_data: {
      title: i18t.ADD_DATA_TITLE,
      description: i18t.ADD_DATA_DESCRIPTION,
    },
    rules: {
      title: i18t.RULES_TITLE,
      description: i18t.RULES_DESCRIPTION,
      manualCompletion: {
        title: i18t.RULES_MANUAL_TITLE,
        description: i18t.RULES_MANUAL_DESCRIPTION,
      },
    },
    alertsCases: {
      title: i18t.CASES_TITLE,
      description: i18t.CASES_DESCRIPTION,
      manualCompletion: {
        title: i18t.CASES_MANUAL_TITLE,
        description: i18t.CASES_MANUAL_DESCRIPTION,
      },
    },
  },
};

export const getSiemGuideConfig = (launchDarkly = defaultGuideTranslations): GuideConfig => ({
  // check each launchDarkly property in case data is misformatted
  title: launchDarkly.title ? launchDarkly.title : defaultGuideTranslations.title,
  guideName: 'Security',
  telemetryId: siemGuideId,
  completedGuideRedirectLocation: {
    appID: 'securitySolutionUI',
    path: '/dashboards',
  },
  description: launchDarkly.description
    ? launchDarkly.description
    : defaultGuideTranslations.description,
  docs: {
    text: launchDarkly.docs ? launchDarkly.docs : defaultGuideTranslations.docs,
    url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
  },
  steps: [
    {
      id: 'add_data',
      title: launchDarkly.steps?.add_data?.title
        ? launchDarkly.steps.add_data.title
        : defaultGuideTranslations.steps.add_data.title,
      description: {
        descriptionText: launchDarkly.steps?.add_data?.description
          ? launchDarkly.steps.add_data.description
          : defaultGuideTranslations.steps.add_data.description,
        linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
        isLinkExternal: true,
        linkText: i18t.LINK_TEXT,
      },
      integration: 'endpoint',
      location: {
        appID: 'integrations',
        path: '/browse/security',
      },
    },
    {
      id: 'rules',
      title: launchDarkly.steps?.rules?.title
        ? launchDarkly.steps.rules.title
        : defaultGuideTranslations.steps.rules.title,
      description: launchDarkly.steps?.rules?.description
        ? launchDarkly.steps.rules.description
        : defaultGuideTranslations.steps.rules.description,
      manualCompletion: {
        title: launchDarkly.steps?.rules?.manualCompletion?.title
          ? launchDarkly.steps.rules.manualCompletion.title
          : defaultGuideTranslations.steps.rules.manualCompletion.title,
        description: launchDarkly.steps?.rules?.manualCompletion?.description
          ? launchDarkly.steps.rules.manualCompletion.description
          : defaultGuideTranslations.steps.rules.manualCompletion.description,
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: launchDarkly.steps?.alertsCases?.title
        ? launchDarkly.steps.alertsCases.title
        : defaultGuideTranslations.steps.alertsCases.title,
      description: launchDarkly.steps?.alertsCases?.description
        ? launchDarkly.steps.alertsCases.description
        : defaultGuideTranslations.steps.alertsCases.description,
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
      manualCompletion: {
        title: launchDarkly.steps?.alertsCases?.manualCompletion?.title
          ? launchDarkly.steps.alertsCases.manualCompletion.title
          : defaultGuideTranslations.steps.alertsCases.manualCompletion.title,
        description: launchDarkly.steps?.alertsCases?.manualCompletion?.description
          ? launchDarkly.steps.alertsCases.manualCompletion.description
          : defaultGuideTranslations.steps.alertsCases.manualCompletion.description,
      },
    },
  ],
});
