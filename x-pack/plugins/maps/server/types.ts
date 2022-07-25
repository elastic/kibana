/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as FeaturesPluginSetupContract } from '@kbn/features-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { MapsEmsPluginServerSetup } from '@kbn/maps-ems-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';

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
