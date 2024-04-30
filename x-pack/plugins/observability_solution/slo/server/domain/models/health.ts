/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { healthStatusSchema, stateSchema } from '@kbn/slo-schema';
import * as t from 'io-ts';

type HealthStatus = t.OutputOf<typeof healthStatusSchema>;
type State = t.OutputOf<typeof stateSchema>;

export type { HealthStatus, State };
