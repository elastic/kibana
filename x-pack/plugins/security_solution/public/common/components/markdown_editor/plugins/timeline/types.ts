/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphEventInfo } from '../../../../../../../timelines/public';
import { ID } from './constants';

export interface TimelineConfiguration {
  id: string | null;
  title: string;
  graphEventInfo?: GraphEventInfo;
  [key: string]: string | null | undefined | GraphEventInfo;
}

export interface TimelineProps extends TimelineConfiguration {
  type: typeof ID;
}
