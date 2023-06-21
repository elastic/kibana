/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ElementTarget } from '@elastic/eui/src/services/findElement';

export enum SecurityStepId {
  rules = 'rules',
  alertsCases = 'alertsCases',
}

export enum AlertsCasesTourSteps {
  none = 0,
  pointToAlertName = 1,
  expandEvent = 2,
  reviewAlertDetailsFlyout = 3,
  addAlertToCase = 4,
  createCase = 5,
  submitCase = 6,
  viewCase = 7,
}

export type StepConfig = Pick<
  EuiTourStepProps,
  | 'step'
  | 'content'
  | 'anchorPosition'
  | 'title'
  | 'ownFocus'
  | 'initialFocus'
  | 'anchor'
  | 'offset'
  | 'repositionOnScroll'
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
  // need both properties below to focus the next button
  ownFocus: true,
  initialFocus: `[tour-step="nextButton"]`,
};

export const getTourAnchor = (step: number, tourId: SecurityStepId) =>
  `tourStepAnchor-${tourId}-${step}`;

const alertsCasesConfig: StepConfig[] = [
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.pointToAlertName,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourTitle', {
      defaultMessage: 'Examine the Alerts Table',
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourContent',
      {
        defaultMessage:
          'To help you practice triaging alerts, here is the alert from the rule that we enabled in the previous step.',
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
        defaultMessage: 'Learn more about alerts by checking out all the information available.',
      }
    ),
    // needs to use anchor to properly place tour step
    anchor: `[tour-step="${getTourAnchor(
      AlertsCasesTourSteps.reviewAlertDetailsFlyout,
      SecurityStepId.alertsCases
    )}"] span.euiTab__content`,
    offset: 20,
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
      defaultMessage: 'From the Take action menu, select "Add to new case".',
    }),
    anchorPosition: 'upRight',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.addAlertToCase, SecurityStepId.alertsCases),
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.createCase,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.createCase.tourTitle', {
      defaultMessage: `Add Case details`,
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.createCase.tourContent',
      {
        defaultMessage: `Provide the relevant information to create the case. We have included sample text for you.`,
      }
    ),
    anchor: `[tour-step="create-case-flyout"] label`,
    anchorPosition: 'leftUp',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.createCase, SecurityStepId.alertsCases),
    offset: 20,
    repositionOnScroll: false,
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.submitCase,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.submitCase.tourTitle', {
      defaultMessage: `Create a case`,
    }),
    content: i18n.translate(
      'xpack.securitySolution.guided_onboarding.tour.submitCase.tourContent',
      {
        defaultMessage: `Press "Create case" to continue.`,
      }
    ),
    anchor: `[tour-step="create-case-flyout"] [tour-step="create-case-submit"]`,
    anchorPosition: 'leftUp',
    hideNextButton: true,
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.submitCase, SecurityStepId.alertsCases),
    offset: 20,
    ownFocus: false,
    initialFocus: `[tour-step="create-case-flyout"] [tour-step="create-case-submit"]`,
  },
  {
    ...defaultConfig,
    step: AlertsCasesTourSteps.viewCase,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.viewCase.tourTitle', {
      defaultMessage: 'View the case',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.viewCase.tourContent', {
      defaultMessage: 'Cases are shown under Insights, in the alert details.',
    }),
    anchorPosition: 'rightUp',
    dataTestSubj: getTourAnchor(AlertsCasesTourSteps.viewCase, SecurityStepId.alertsCases),
  },
];

export const sampleCase = {
  title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.createCase.title', {
    defaultMessage: `This is a test case`,
  }),
  description: i18n.translate(
    'xpack.securitySolution.guided_onboarding.tour.createCase.description',
    {
      defaultMessage:
        'Add a description and other relevant information. The alert will be added to the case.',
    }
  ),
};

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
