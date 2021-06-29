/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { type } from '@kbn/securitysolution-io-ts-alerting-types';
import { timeline_id } from '../common/schemas';

/**
 * Special schema type that is only the type and the timeline_id.
 * This is used for dependent type checking only.
 */
export const typeAndTimelineOnlySchema = t.intersection([
  t.exact(t.type({ type })),
  t.exact(t.partial({ timeline_id })),
]);
export type TypeAndTimelineOnly = t.TypeOf<typeof typeAndTimelineOnlySchema>;
