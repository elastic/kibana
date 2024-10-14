/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import type { SavedObjectsClientFactory } from '../saved_objects';
import type { EndpointFleetServicesFactoryInterface } from './endpoint_fleet_services_factory';
import { EndpointFleetServicesFactory } from './endpoint_fleet_services_factory';
import { createSavedObjectsClientFactoryMock } from '../saved_objects/saved_objects_client_factory.mocks';

interface EndpointFleetServicesFactoryInterfaceMocked
  extends EndpointFleetServicesFactoryInterface {
  asInternalUser: () => DeeplyMockedKeys<
    ReturnType<EndpointFleetServicesFactoryInterface['asInternalUser']>
  >;
}

interface CreateEndpointFleetServicesFactoryMockOptions {
  fleetDependencies: DeeplyMockedKeys<FleetStartContract>;
  savedObjects: SavedObjectsClientFactory;
}

export const createEndpointFleetServicesFactoryMock = (
  dependencies: Partial<CreateEndpointFleetServicesFactoryMockOptions> = {}
): {
  service: EndpointFleetServicesFactoryInterfaceMocked;
  dependencies: CreateEndpointFleetServicesFactoryMockOptions;
} => {
  const {
    fleetDependencies = createFleetStartContractMock(),
    savedObjects = createSavedObjectsClientFactoryMock().service,
  } = dependencies;

  return {
    service: new EndpointFleetServicesFactory(
      fleetDependencies,
      savedObjects
    ) as unknown as EndpointFleetServicesFactoryInterfaceMocked,
    dependencies: { fleetDependencies, savedObjects },
  };
};
