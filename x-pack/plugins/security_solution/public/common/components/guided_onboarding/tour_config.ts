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
  'step' | 'content' | 'anchorPosition' | 'title' | 'initialFocus'
> & {
  anchor: string;
  dataTestSubj: string;
  hideNextButton?: boolean;
  imageConfig?: {
    altText: string;
    src: string;
  };
  primaryTourStep: { guideId: string; stepId: string };
};

type TourConfig = StepConfig[];

export const getTourAnchor = (step: number) => `tourStepAnchor-alerts-${step}`;

export const tourConfig: TourConfig = [
  {
    step: 1,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourTitle', {
      defaultMessage: 'Test alert for practice',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourContent',
      {
        defaultMessage:
          'To help you practice triaging alerts, we enabled a rule to create your first alert.',
      }
    ),
    anchor: `[data-test-subj="${getTourAnchor(1)}"]`,
    anchorPosition: 'downCenter',
    dataTestSubj: '8.6-tourStep-alerts-1',
    primaryTourStep: { guideId: 'security', stepId: 'alerts' },
  },
  {
    step: 2,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.openFlyout.tourTitle', {
      defaultMessage: 'Open the flyout',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.openFlyout.tourContent',
      {
        defaultMessage:
          'We show minimal information in the table. You can see more details in the flyout. Click the icon to open the flyout.',
      }
    ),
    anchor: `[data-test-subj="${getTourAnchor(2)}"]`,
    anchorPosition: 'rightUp',
    initialFocus: `[data-test-subj="8.6-tourStepAnchor-alerts-2"]`,
    dataTestSubj: '8.6-tourStep-alerts-2',
    hideNextButton: true,
    primaryTourStep: { guideId: 'security', stepId: 'alerts' },
  },
  {
    step: 3,
    title: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.flyoutOverview.tourTitle',
      {
        defaultMessage: 'Flyout overview',
      }
    ),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.flyoutOverview.tourContent',
      {
        defaultMessage:
          'This alert was created by a rule we automatically enabled in the previous step so that we can show you how to triage alerts.',
      }
    ),
    anchor: `[data-test-subj="${getTourAnchor(3)}"]`,
    anchorPosition: 'leftUp',
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
    primaryTourStep: { guideId: 'security', stepId: 'alerts' },
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
    anchor: `[data-test-subj="${getTourAnchor(4)}"]`,
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
    primaryTourStep: { guideId: 'security', stepId: 'alerts' },
  },
  {
    step: 5,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourTitle', {
      defaultMessage: `Start gathering your data!`,
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.dataStep.tourContent', {
      defaultMessage: `Collect data from your endpoints using the Elastic Agent and a variety of third-party integrations.`,
    }),
    anchor: `[data-test-subj="${getTourAnchor(5)}"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'dataStep',
    primaryTourStep: { guideId: 'security', stepId: 'alerts' },
  },
];
