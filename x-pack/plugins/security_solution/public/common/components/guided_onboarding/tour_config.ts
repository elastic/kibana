/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import alertsGif from '../../images/onboarding_tour_step_alerts.gif';
import casesGif from '../../images/onboarding_tour_step_cases.gif';

export type StepConfig = Pick<
  EuiTourStepProps,
  'step' | 'content' | 'anchorPosition' | 'title' | 'data-test-subj'
> & {
  anchor: string;
  imageConfig?: {
    altText: string;
    src: string;
  };
};

type TourConfig = StepConfig[];

export const tourConfig: TourConfig = [
  {
    step: 1,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.overviewStep.tourTitle', {
      defaultMessage: 'Welcome to Elastic Security',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.overviewStep.tourContent',
      {
        defaultMessage:
          'Take a quick tour of the Security solution to get a feel for how it works.',
      }
    ),
    anchor: `[id^="SolutionNav"]`,
    anchorPosition: 'rightUp',
    'data-test-subj': 'welcomeStep',
  },
  {
    step: 2,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.manageStep.tourTitle', {
      defaultMessage: 'Define prevention, detection, and response across your entire ecosystem',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.manageStep.tourContent',
      {
        defaultMessage:
          'Create rules to detect and prevent malicious activity, and implement threat intelligence to protect endpoints and cloud workloads.',
      }
    ),
    anchor: `[data-test-subj="groupedNavItemLink-administration"]`,
    anchorPosition: 'rightUp',
    'data-test-subj': 'manageStep',
  },
  {
    step: 3,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when your security rules are triggered',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.alertsStep.tourContent',
      {
        defaultMessage: 'Detect, investigate, and respond to evolving threats in your environment.',
      }
    ),
    anchor: `[data-test-subj="groupedNavItemLink-alerts"]`,
    anchorPosition: 'rightUp',
    imageConfig: {
      src: alertsGif,
      altText: i18n.translate(
        'xpack.securitySolution.guided_onboarding.tour.alertsStep.imageAltText',
        {
          defaultMessage: 'Alerts demonstration',
        }
      ),
    },
    'data-test-subj': 'alertsStep',
  },
  {
    step: 4,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.casesStep.tourTitle', {
      defaultMessage: 'Collect and share information about security issues',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.casesStep.tourContent', {
      defaultMessage:
        'Track key investigation details, collect alerts in a central location, and more.',
    }),
    anchor: `[data-test-subj="groupedNavItemLink-cases"]`,
    anchorPosition: 'rightUp',
    imageConfig: {
      src: casesGif,
      altText: i18n.translate(
        'xpack.securitySolution.guided_onboarding.tour.casesStep.imageAltText',
        {
          defaultMessage: 'Cases demonstration',
        }
      ),
    },
    'data-test-subj': 'casesStep',
  },
  {
    step: 5,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourTitle', {
      defaultMessage: `You're ready!`,
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourContent', {
      defaultMessage: `View and add your first integration to start protecting your environment. Return to the Security solution when you're done.`,
    }),
    anchor: `[data-test-subj="add-data"]`,
    anchorPosition: 'rightUp',
    'data-test-subj': 'dataStep',
  },
];
