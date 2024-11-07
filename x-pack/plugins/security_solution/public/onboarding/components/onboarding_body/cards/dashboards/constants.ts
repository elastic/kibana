/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dashboardImageSrc from './images/dashboard_step.png';
import type { Step } from '../common/step_selector';

export const dashboardIntroSteps: Step[] = [
  {
    id: 'details',
    title: 'Intro to Elastic Discover',
    description: 'Quickly add and enable the rules you need with Elastic’s prebuilt rules',
    asset: {
      type: 'image',
      source: dashboardImageSrc,
      alt: 'details_image',
    },
  },
];
