/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventSchema } from './event_schema';
import { IlmPolicy } from './ilm_policy';
import { Templates } from './index_template';

export interface EventLogDefinition<TEvent> {
  logName: string;
  schema: EventSchema<TEvent>;
  templates: Templates;
  ilmPolicy?: IlmPolicy;
}
