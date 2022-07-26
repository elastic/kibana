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

export type StepConfig = Pick<EuiTourStepProps, 'step' | 'content' | 'anchorPosition' | 'title'> & {
  anchor: string;
  dataTestSubj: string;
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
          'Take a quick tour to explore a unified workflow for investigating suspicious activity.',
      }
    ),
    anchor: `[id^="SolutionNav"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'welcomeStep',
  },
  {
    step: 2,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.manageStep.tourTitle', {
      defaultMessage: 'Protect your ecosystem',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.manageStep.tourContent',
      {
        defaultMessage:
          'Decide what matters to you and your environment and create rules to detect and prevent malicious activity. ',
      }
    ),
    anchor: `[data-test-subj="groupedNavItemLink-administration"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'manageStep',
  },
  {
    step: 3,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when something changes',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.alertsStep.tourContent',
      {
        defaultMessage:
          "Know when a rule's conditions are met, so you can start your investigation right away. Set up notifications with third-party platforms like Slack, PagerDuty, and ServiceNow.",
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
    dataTestSubj: 'alertsStep',
  },
  {
    step: 4,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.casesStep.tourTitle', {
      defaultMessage: 'Create a case to track your investigation',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.casesStep.tourContent', {
      defaultMessage:
        'Collect evidence, add more collaborators, and even push case details to third-party case management systems.',
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
    dataTestSubj: 'casesStep',
  },
  {
    step: 5,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourTitle', {
      defaultMessage: `Start gathering your data!`,
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourContent', {
      defaultMessage: `Collect data from your endpoints using the Elastic Agent and a variety of third-party integrations.`,
    }),
    anchor: `[data-test-subj="add-data"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'dataStep',
  },
];
