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
  // TODO: @Yulia, can we make these either all snake case or all camelcase?
  addData = 'add_data',
  rules = 'rules',
  alertsCases = 'alertsCases',
}

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
    anchor: `[tour-step="${getTourAnchor(1, SecurityStepId.alertsCases)}"]`,
    anchorPosition: 'downCenter',
    dataTestSubj: 'tourStep-alerts-1',
  },
  {
    ...defaultConfig,
    step: 2,
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
    anchor: `[tour-step="${getTourAnchor(2, SecurityStepId.alertsCases)}"]`,
    anchorPosition: 'rightUp',
    initialFocus: `[tour-step="${getTourAnchor(2, SecurityStepId.alertsCases)}"]`,
    dataTestSubj: 'tourStep-alerts-2',
    hideNextButton: true,
  },
  {
    ...defaultConfig,
    step: 3,
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
    anchor: `[tour-step="${getTourAnchor(3, SecurityStepId.alertsCases)}"]`,
    anchorPosition: 'leftUp',
    dataTestSubj: 'tourStep-alerts-3',
  },
  {
    ...defaultConfig,
    step: 4,
    title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourTitle', {
      defaultMessage: 'Create a case',
    }),
    content: i18n.translate('xpack.securitySolution.guided_onboarding.tour.addToCase.tourContent', {
      defaultMessage: 'From the Take action menu, add the alert to a new case.',
    }),
    anchor: `[tour-step="${getTourAnchor(4, SecurityStepId.alertsCases)}"]`,
    anchorPosition: 'upRight',
    dataTestSubj: 'tourStep-alerts-4',
    hideNextButton: true,
  },
  {
    ...defaultConfig,
    step: 5,
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
    dataTestSubj: 'tourStep-alerts-5',
    hideNextButton: true,
  },
];

interface SecurityTourConfig {
  [SecurityStepId.addData]: StepConfig[];
  [SecurityStepId.rules]: StepConfig[];
  [SecurityStepId.alertsCases]: StepConfig[];
}

export const securityTourConfig: SecurityTourConfig = {
  /**
   * OLM/D&R team implement your tour config here
   */
  [SecurityStepId.addData]: [],
  [SecurityStepId.rules]: [],
  [SecurityStepId.alertsCases]: alertsCasesConfig,
};
