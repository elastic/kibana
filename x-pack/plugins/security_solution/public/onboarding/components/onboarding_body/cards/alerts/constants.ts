/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import alertTimelineImageSrc from './images/alert_timeline.png';
import eventAnalyzerImageSrc from './images/event_analyzer.png';
import sessionViewImageSrc from './images/session_view.png';
import type { SelectorItem } from '../common/selector';

const VIDEO_SOURCE = '//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?autoplay=1';

export const alertsIntroSteps: SelectorItem[] = [
  {
    id: 'details',
    title: 'Alert list and details',
    description: 'Sort through alerts and drill down into its details',
    asset: {
      type: 'video',
      source: VIDEO_SOURCE,
      alt: 'details_media',
    },
  },
  {
    id: 'timeline',
    title: 'Investigate in Timeline',
    description: 'Streamline alert investigation with real-time visualization',
    asset: {
      type: 'image',
      source: alertTimelineImageSrc,
      alt: 'timeline_media',
    },
  },
  {
    id: 'analyzer',
    title: 'Investigate in Analyzer',
    description: 'Simplify alert analysis by visualizing threat detection processes ',
    asset: {
      type: 'image',
      source: eventAnalyzerImageSrc,
      alt: 'analyzer_media',
    },
  },
  {
    id: 'sessionView',
    title: 'Investigate in Session View',
    description: 'Centralized threat analysis and response with real-time data insights',
    asset: {
      type: 'image',
      source: sessionViewImageSrc,
      alt: 'sessionView_media',
    },
  },
];
