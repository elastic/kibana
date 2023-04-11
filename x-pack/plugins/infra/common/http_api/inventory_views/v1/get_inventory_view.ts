/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
// import { logViewRT } from '../../log_views';

export const getInventoryViewRequestParamsRT = rt.type({
  // the id of the log view
  logViewId: rt.string,
});

// export const getInventoryViewResponsePayloadRT = rt.type({
//   data: logViewRT,
// });
