/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';

export const siemGuideId = 'siem';
export const siemGuideConfig: GuideConfig = {
  title: i18n.translate('xpack.securitySolution.guideConfig.title', {
    defaultMessage: 'Detect threats in my data with SIEM',
  }),
  guideName: 'Security',
  telemetryId: 'siem',
  completedGuideRedirectLocation: {
    appID: 'securitySolutionUI',
    path: '/dashboards',
  },
  description: i18n.translate('xpack.securitySolution.guideConfig.description', {
    defaultMessage: `There are many ways to get your SIEM data into Elastic. In this guide, we'll help you get set up quickly using the Elastic Defend integration.`,
  }),
  docs: {
    text: i18n.translate('xpack.securitySolution.guideConfig.documentationLink', {
      defaultMessage: 'Learn more',
    }),
    url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
  },
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('xpack.securitySolution.guideConfig.addDataStep.title', {
        defaultMessage: 'Add data with Elastic Defend',
      }),
      description: {
        descriptionText: i18n.translate(
          'xpack.securitySolution.guideConfig.addDataStep.description',
          {
            defaultMessage:
              'Install Elastic Agent and its Elastic Defend integration on one of your computers to get SIEM data flowing.',
          }
        ),
        linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
        isLinkExternal: true,
        linkText: i18n.translate(
          'xpack.securitySolution.guideConfig.addDataStep.description.linkText',
          {
            defaultMessage: 'Learn more',
          }
        ),
      },
      integration: 'endpoint',
      location: {
        appID: 'integrations',
        path: '/browse/security',
      },
    },
    {
      id: 'rules',
      title: i18n.translate('xpack.securitySolution.guideConfig.rulesStep.title', {
        defaultMessage: 'Turn on rules',
      }),
      description: i18n.translate('xpack.securitySolution.guideConfig.rulesStep.description', {
        defaultMessage:
          'Load the Elastic prebuilt rules, select the rules you want, and enable them to generate alerts.',
      }),
      manualCompletion: {
        title: i18n.translate(
          'xpack.securitySolution.guideConfig.rulesStep.manualCompletion.title',
          {
            defaultMessage: 'Continue with the guide',
          }
        ),
        description: i18n.translate(
          'xpack.securitySolution.guideConfig.rulesStep.manualCompletion.description',
          {
            defaultMessage: `After you've enabled the rules you need, continue.`,
          }
        ),
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: i18n.translate('xpack.securitySolution.guideConfig.alertsStep.title', {
        defaultMessage: 'Manage alerts and cases',
      }),
      description: i18n.translate('xpack.securitySolution.guideConfig.alertsStep.description', {
        defaultMessage: 'Learn how to view and triage alerts with cases.',
      }),
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
      manualCompletion: {
        title: i18n.translate(
          'xpack.securitySolution.guideConfig.alertsStep.manualCompletion.title',
          {
            defaultMessage: 'Continue the guide',
          }
        ),
        description: i18n.translate(
          'xpack.securitySolution.guideConfig.alertsStep.manualCompletion.description',
          {
            defaultMessage: `After you've explored the case, continue.`,
          }
        ),
      },
    },
  ],
};
