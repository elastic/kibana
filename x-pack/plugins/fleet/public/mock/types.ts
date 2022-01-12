/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';

import type { FleetSetupDeps, FleetStart, FleetStartDeps, FleetStartServices } from '../plugin';

export type MockedFleetStartServices = MockedKeys<FleetStartServices>;

export type MockedFleetSetupDeps = MockedKeys<FleetSetupDeps>;

export type MockedFleetStartDeps = MockedKeys<FleetStartDeps>;

// Don't wrap the `authz` property which is a promise with `jest.Mocked`
export type MockedFleetStart = MockedKeys<Omit<FleetStart, 'authz'>> & Pick<FleetStart, 'authz'>;
