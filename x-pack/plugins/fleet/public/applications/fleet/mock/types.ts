/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '../../../../../../../packages/kbn-utility-types/jest/index';
import { FleetSetupDeps, FleetStart, FleetStartDeps, FleetStartServices } from '../../../plugin';

export type MockedFleetStartServices = MockedKeys<FleetStartServices>;

export type MockedFleetSetupDeps = MockedKeys<FleetSetupDeps>;

export type MockedFleetStartDeps = MockedKeys<FleetStartDeps>;

export type MockedFleetStart = MockedKeys<FleetStart>;
