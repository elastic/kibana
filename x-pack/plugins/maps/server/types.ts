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
import { MapsEmsPluginServerSetup } from '../../../../src/plugins/maps_ems/server';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';

export interface SetupDeps {
  data: DataPluginSetup;
  features: FeaturesPluginSetupContract;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  mapsEms: MapsEmsPluginServerSetup;
  embeddable: EmbeddableSetup;
  customIntegrations: CustomIntegrationsPluginSetup;
}

export interface StartDeps {
  data: DataPluginStart;
}
