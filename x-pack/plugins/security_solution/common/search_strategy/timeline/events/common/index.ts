/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../ecs';
import { CursorType, Maybe } from '../../../common';

export interface TimelineEdges {
  node: TimelineItem;
  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;
  _index?: Maybe<string>;
  data: TimelineNonEcsData[];
  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;
  value?: Maybe<string[] | string>;
}
