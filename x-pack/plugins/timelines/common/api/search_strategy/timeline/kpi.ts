/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { timelineRequestBasicOptionsSchema } from './request_basic';

export const timelineKpiRequestOptionsSchema = timelineRequestBasicOptionsSchema;

export type TimelineKpiRequestOptionsInput = z.input<typeof timelineKpiRequestOptionsSchema>;

export type TimelineKpiRequestOptions = z.infer<typeof timelineKpiRequestOptionsSchema>;
