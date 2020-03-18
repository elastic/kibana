/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for firing and registering for events in the
 * anomalies or annotations table component.
 */

import { Subject } from 'rxjs';

export const mlTableService = {
  rowMouseenter$: new Subject(),
  rowMouseleave$: new Subject(),
};
