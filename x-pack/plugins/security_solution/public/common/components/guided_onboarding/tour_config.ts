/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ElementTarget } from '@elastic/eui/src/services/findElement';

export type StepConfig = Pick<
  EuiTourStepProps,
  'step' | 'content' | 'anchorPosition' | 'title' | 'initialFocus' | 'anchor'
> & {
  anchor: ElementTarget;
  dataTestSubj: string;
  hideNextButton?: boolean;
  imageConfig?: {
    altText: string;
    src: string;
  };
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
    anchor: `[tour-step="${getTourAnchor(1)}"]`,
    anchorPosition: 'downCenter',
    dataTestSubj: 'tourStep-alerts-1',
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
    anchor: `[tour-step="${getTourAnchor(2)}"]`,
    anchorPosition: 'rightUp',
    initialFocus: `[tour-step="${getTourAnchor(2)}"]`,
    dataTestSubj: 'tourStep-alerts-2',
    hideNextButton: true,
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
    anchor: `[tour-step="${getTourAnchor(3)}"]`,
    anchorPosition: 'leftUp',
    dataTestSubj: 'tourStep-alerts-3',
  },
  {
    step: 4,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourTitle', {
      defaultMessage: 'Create a case',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourContent', {
      defaultMessage: 'Click the button and select add to a new case',
    }),
    anchor: `[tour-step="${getTourAnchor(4)}"]`,
    anchorPosition: 'upRight',
    dataTestSubj: 'tourStep-alerts-4',
    hideNextButton: true,
  },
  {
    step: 5,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.createCase.tourTitle', {
      defaultMessage: `Complete the case details`,
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.createCase.tourContent',
      {
        defaultMessage: `The alert will be added to the case...`,
      }
    ),
    anchor: `[data-test-subj="create-case-flyout"]`,
    anchorPosition: 'leftUp',
    dataTestSubj: 'tourStep-alerts-5',
  },
];
