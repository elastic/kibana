/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from '../../../../src/plugins/home/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { MapsEmsPluginSetup } from '../../../../src/plugins/maps_ems/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/server/plugin';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';

export interface SetupDeps {
  features: FeaturesPluginSetupContract;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  mapsEms: MapsEmsPluginSetup;
  embeddable: EmbeddableSetup;
}

export interface StartDeps {
  data: DataPluginStart;
}
