/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ElementTarget } from '@elastic/eui/src/services/findElement';

export const enum SecurityStepId {
  rules = 'rules',
  alertsCases = 'alertsCases',
}

export const enum AlertsCasesTourSteps {
  none = 0,
  pointToAlertName = 1,
  expandEvent = 2,
  reviewAlertDetailsFlyout = 3,
  addAlertToCase = 4,
  createCase = 5,
}

export type StepConfig = Pick<
  EuiTourStepProps,
  'step' | 'content' | 'anchorPosition' | 'title' | 'initialFocus' | 'anchor'
> & {
  anchor?: ElementTarget;
  dataTestSubj: string;
  hideNextButton?: boolean;
  imageConfig?: {
    altText: string;
    src: string;
  };
};

const defaultConfig = {
  minWidth: 360,
  maxWidth: 360,
  offset: 10,
  repositionOnScroll: true,
};

export const getTourAnchor = (step: number, stepId: SecurityStepId) =>
  `tourStepAnchor-${stepId}-${step}`;

const alertsCasesConfig: StepConfig[] = [
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.pointToAlertName,
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
    anchorPosition: 'downCenter',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.pointToAlertName, SecurityStepId.alertsCases),
    initialFocus: `button[tour-step="nextButton"]`,
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.expandEvent,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.openFlyout.tourTitle', {
      defaultMessage: 'Review the alert details',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.openFlyout.tourContent',
      {
        defaultMessage:
          "Some information is provided at-a-glance in the table, but for full details, you'll want to open the alert.",
      }
    ),
    anchorPosition: 'rightUp',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.expandEvent, SecurityStepId.alertsCases),
    hideNextButton: true,
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.reviewAlertDetailsFlyout,
    title: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.flyoutOverview.tourTitle',
      {
        defaultMessage: 'Explore alert details',
      }
    ),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.flyoutOverview.tourContent',
      {
        defaultMessage:
          'Learn more about alerts by checking out all the information available on each tab.',
      }
    ),
    // needs to use anchor to properly place tour step
    anchor: `[tour-step="${getTourAnchor(
      AlertsCasesTourSteps.reviewAlertDetailsFlyout,
      SecurityStepId.alertsCases
    )}"] .euiTabs`,
    anchorPosition: 'leftUp',
    dataTestSubj: getTourAnchor(
      AlertsCasesTourSteps.reviewAlertDetailsFlyout,
      SecurityStepId.alertsCases
    ),
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.addAlertToCase,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourTitle', {
      defaultMessage: 'Create a case',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourContent', {
      defaultMessage: 'From the Take action menu, add the alert to a new case.',
    }),
    anchorPosition: 'upRight',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.addAlertToCase, SecurityStepId.alertsCases),
    hideNextButton: true,
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.createCase,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.createCase.tourTitle', {
      defaultMessage: `Add details`,
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.createCase.tourContent',
      {
        defaultMessage: `In addition to the alert, you can add any relevant information you need to the case.`,
      }
    ),
    anchor: `[data-test-subj="create-case-flyout"]`,
    anchorPosition: 'leftUp',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.createCase, SecurityStepId.alertsCases),
    hideNextButton: true,
  },
];

interface SecurityTourConfig {
  [SecurityStepId.rules]: StepConfig[];
  [SecurityStepId.alertsCases]: StepConfig[];
}

export const securityTourConfig: SecurityTourConfig = {
  /**
   * D&R team implement your tour config here
   */
  [SecurityStepId.rules]: [],
  [SecurityStepId.alertsCases]: alertsCasesConfig,
};
