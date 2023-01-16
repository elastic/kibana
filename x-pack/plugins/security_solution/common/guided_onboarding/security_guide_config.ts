/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding-plugin/common';
import { i18n } from '@kbn/i18n';

export const securityGuideId = 'security';
export const securityGuideConfig: GuideConfig = {
  title: i18n.translate('xpack.securitySolution.guideConfig.title', {
    defaultMessage: 'Elastic Security guided setup',
  }),
  guideName: 'Security',
  completedGuideRedirectLocation: {
    appID: 'securitySolutionUI',
    path: '/dashboards',
  },
  description: i18n.translate('xpack.securitySolution.guideConfig.description', {
    defaultMessage: `We'll help you get set up quickly, using Elastic Defend.`,
  }),
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('xpack.securitySolution.guideConfig.addDataStep.title', {
        defaultMessage: 'Add data with Elastic Defend',
      }),
      descriptionList: [
        i18n.translate('xpack.securitySolution.guideConfig.addDataStep.description1', {
          defaultMessage: 'Use Elastic Defend to add your data.',
        }),
        i18n.translate('xpack.securitySolution.guideConfig.addDataStep.description2', {
          defaultMessage: 'See data coming in to your SIEM.',
        }),
      ],
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
      descriptionList: [
        i18n.translate('xpack.securitySolution.guideConfig.rulesStep.description1', {
          defaultMessage: 'Load the Elastic prebuilt rules.',
        }),
        i18n.translate('xpack.securitySolution.guideConfig.rulesStep.description2', {
          defaultMessage: 'Select and enable rules.',
        }),
        i18n.translate('xpack.securitySolution.guideConfig.rulesStep.description3', {
          defaultMessage: 'Enable rules to generate alerts.',
        }),
      ],
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
            defaultMessage: 'After you’ve enabled the rules you need, continue.',
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
      descriptionList: [
        i18n.translate('xpack.securitySolution.guideConfig.alertsStep.description1', {
          defaultMessage: 'View and triage alerts.',
        }),
        i18n.translate('xpack.securitySolution.guideConfig.alertsStep.description2', {
          defaultMessage: 'Create a case.',
        }),
      ],
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
