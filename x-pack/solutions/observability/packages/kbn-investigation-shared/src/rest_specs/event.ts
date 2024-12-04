/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { eventSchema } from '../schema';

const eventResponseSchema = eventSchema;

type EventResponse = z.output<typeof eventResponseSchema>;
type EventSchema = z.output<typeof eventSchema>;

export { eventResponseSchema };
export type { EventResponse, EventSchema };
