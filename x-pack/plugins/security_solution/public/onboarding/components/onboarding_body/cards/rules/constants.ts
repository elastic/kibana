/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import installRulesImageSrc from './images/install_rule.png';
import type { SelectorItem } from '../common/selector';

const VIDEO_SOURCE = '//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?autoplay=1';

export const rulesIntroSteps: SelectorItem[] = [
  {
    id: 'install',
    title: 'Install Elastic rules',
    description: 'Quickly add and enable the rules you need with Elastic’s prebuilt rules',
    asset: {
      type: 'image',
      source: installRulesImageSrc,
      alt: 'install_image',
    },
  },
  {
    id: 'create',
    title: 'Create a custom rule',
    description: 'Create a custom detection rule for local or remote data',
    asset: {
      type: 'video',
      source: VIDEO_SOURCE,
      alt: 'create_video',
    },
  },
];
