/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { timeline_id, type } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

/**
 * Special schema type that is only the type and the timeline_id.
 * This is used for dependent type checking only.
 */
export const typeAndTimelineOnlySchema = t.intersection([
  t.exact(t.type({ type })),
  t.exact(t.partial({ timeline_id })),
]);
export type TypeAndTimelineOnly = t.TypeOf<typeof typeAndTimelineOnlySchema>;
