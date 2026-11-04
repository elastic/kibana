/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

export interface NightshiftSignificantEventLocatorParams extends SerializableRecord {
  /** The significant event whose flyout opens on the Detections events page. */
  eventId: string;
}
