/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { rollingTimeWindowSchema, timeWindowSchema } from '@kbn/slo-schema';

type TimeWindow = t.TypeOf<typeof timeWindowSchema>;
type RollingTimeWindow = t.TypeOf<typeof rollingTimeWindowSchema>;

export type { RollingTimeWindow, TimeWindow };
