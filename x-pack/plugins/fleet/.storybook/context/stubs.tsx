/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetStartServices } from '../../public/plugin';

type Stubs =
  | 'licensing'
  | 'storage'
  | 'data'
  | 'deprecations'
  | 'fatalErrors'
  | 'navigation'
  | 'overlays'
  | 'savedObjects';

type StubbedStartServices = Pick<FleetStartServices, Stubs>;

export const stubbedStartServices: StubbedStartServices = {
  licensing: {} as FleetStartServices['licensing'],
  storage: {} as FleetStartServices['storage'],
  data: {} as FleetStartServices['data'],
  deprecations: {} as FleetStartServices['deprecations'],
  fatalErrors: {} as FleetStartServices['fatalErrors'],
  navigation: {} as FleetStartServices['navigation'],
  overlays: {} as FleetStartServices['overlays'],
  savedObjects: {} as FleetStartServices['savedObjects'],
};
