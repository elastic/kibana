/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackageSpecIcon, RegistryDataStream } from '@kbn/fleet-plugin/common';

export interface AssetSpecification {
  display_name: string;
  display_icon: string;
  // Maybe I should have the index pattern here to make the resolve query more precise?
  // Is there any correlation between the assets and the data streams list?
  identifier_field: string;
  display_name_field?: string;
  overview_dashboard_id: string;
  details_dashboard_id: string;
}

export interface ObsIntegrationMetadata {
  integration_name: string;
  display_name: string;
  display_icon: string;
  overview_dashboard_id: string;
  assets: AssetSpecification[];
}

export interface IntegrationSummary {
  name: string;
  display_name: string;
  assets: AssetSummary[];
}

export interface AssetSummary {
  name: string;
  display_name: string;
}

export interface Integration {
  metadata: ObsIntegrationMetadata;
  package: {
    icons: PackageSpecIcon[];
    data_streams: RegistryDataStream[];
  };
}

export interface Asset {
  id: string;
  display_name?: string;
}

export interface GetResolveAssetsQueryParams {
  indexPattern: string;
  identifierField: string;
  from: string;
  to: string;
  displayNameField?: string;
  filter?: string;
}
