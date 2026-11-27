/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

/** Params of the Nightshift automation locator: the automation whose details page opens. */
export interface NightshiftAutomationLocatorParams extends SerializableRecord {
  automationId: string;
}
