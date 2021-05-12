/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';

export interface TimelinesPluginSetup {
  getTimeline?: (props: TimelineProps) => ReactElement<TimelineProps>;
}

export interface TimelineProps {
  timelineId: string;
}
