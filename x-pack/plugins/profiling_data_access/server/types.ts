/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CloudStart } from '@kbn/cloud-plugin/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';

export interface ProfilingPluginStartDeps {
  fleet?: FleetStartContract;
  cloud?: CloudStart;
}
