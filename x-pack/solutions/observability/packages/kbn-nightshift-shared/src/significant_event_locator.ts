/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

/** Query param of the Nightshift events page that opens the flyout of one significant event. */
export const NIGHTSHIFT_EVENT_ID_QUERY_PARAM = 'eventId';

export interface NightshiftSignificantEventLocatorParams extends SerializableRecord {
  eventId: string;
}
