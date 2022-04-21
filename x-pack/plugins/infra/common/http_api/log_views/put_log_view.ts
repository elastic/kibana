/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { logViewAttributesRT, logViewRT } from '../../log_views';

export const putLogViewRequestParamsRT = rt.type({
  logViewId: rt.string,
});

export const putLogViewRequestPayloadRT = rt.type({
  attributes: rt.partial(logViewAttributesRT.type.props),
});
export type PutLogViewRequestPayload = rt.TypeOf<typeof putLogViewRequestPayloadRT>;

export const putLogViewResponsePayloadRT = rt.type({
  data: logViewRT,
});
