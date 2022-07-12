/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import alertsGif from '../../images/onboarding_tour_step_alerts.gif';
import rulesGif from '../../images/onboarding_tour_step_rules.gif';
import casesGif from '../../images/onboarding_tour_step_cases.gif';

type TourConfig = Array<
  Pick<EuiTourStepProps, 'step' | 'content' | 'anchor' | 'anchorPosition' | 'title'> & {
    imageConfig?: {
      altText: string;
      src: string;
    };
  }
>;
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
          'Take a quick tour to explore a unified workflow for  investigating suspicious activity.',
      }
    ),
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 2,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.rulesStep.tourTitle', {
      defaultMessage: 'Define rules to track unusual activity',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.rulesStep.tourContent', {
      defaultMessage:
        'Decide what matters to you and your environment. Choose from pre-built rules or customize them to suit your needs.',
    }),
    anchor: `[data-test-subj="navigation-rules"]`,
    anchorPosition: 'rightUp',
    imageConfig: {
      src: rulesGif,
      altText: i18n.translate(
        'xpack.securitySolution.guided_onboarding.tour.rulesStep.imageAltText',
        {
          defaultMessage: 'Rules demonstration',
        }
      ),
    },
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
    anchor: `[data-test-subj="navigation-alerts"]`,
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
    anchor: `[data-test-subj="navigation-cases"]`,
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
  },
  {
    step: 5,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourTitle', {
      defaultMessage: `Start gathering your data!`,
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourContent', {
      defaultMessage: `Collect data from your endpoints using Elastic Agent and a variety of third-party integrations.`,
    }),
    anchor: `[data-test-subj="add-data"]`,
    anchorPosition: 'rightUp',
  },
];
