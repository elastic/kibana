/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageUpdateEvent } from '../services/upgrade_sender';

export interface FleetTelemetryChannelEvents {
  // channel name => event type
  'fleet-upgrades': PackageUpdateEvent;
}

export type FleetTelemetryChannel = keyof FleetTelemetryChannelEvents;
