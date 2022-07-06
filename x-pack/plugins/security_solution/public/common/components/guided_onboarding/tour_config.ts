/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTourStepProps } from '@elastic/eui';

type TourConfig = Array<
  Pick<EuiTourStepProps, 'step' | 'content' | 'anchor' | 'anchorPosition' | 'title'>
>;

export const tourConfig: TourConfig = [
  {
    step: 1,
    title: 'Welcome to Elastic Security',
    content:
      'Take a quick tour to explore a unified workflow for  investigating suspicious activity.',
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 2,
    title: 'Define rules to track unusual activity',
    content:
      'Decide what matters to you and your environment. Choose from pre-built rules or customize them to suit your needs.',
    anchor: `[data-test-subj="navigation-rules"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 3,
    title: 'Get notified when something changes',
    content:
      "Know when a rule's conditions are met, so you can start your investigation right away. Set up notifications with third-party platforms like Slack, PagerDuty, and ServiceNow.",
    anchor: `[data-test-subj="navigation-alerts"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 4,
    title: 'Create a case to track your investigation',
    content:
      'Collect evidence, add more collaborators, and even push case details to third-party case management systems.',
    anchor: `[data-test-subj="navigation-cases"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 5,
    title: `Start gathering your data!`,
    content: `Collect data from your endpoints using the Elastic Agent and a variety of third-party integrations.`,
    anchor: `[data-test-subj="add-data"]`,
    anchorPosition: 'rightUp',
  },
];
