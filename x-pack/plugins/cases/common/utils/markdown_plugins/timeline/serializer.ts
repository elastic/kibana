/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from 'src/plugins/data/common';
import { ID } from './constants';

export interface TimelineSerializerProps {
  match: string;
}

export const TimelineSerializer = ({ match }: TimelineSerializerProps) => match;
