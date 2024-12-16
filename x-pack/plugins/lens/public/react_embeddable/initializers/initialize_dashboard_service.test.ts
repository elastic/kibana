/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensRuntimeState } from '../types';
import { getLensRuntimeStateMock, getLensInternalApiMock, makeEmbeddableServices } from '../mocks';
import { initializeStateManagement } from './initialize_state_management';
import { initializeDashboardServices } from './initialize_dashboard_services';
import { faker } from '@faker-js/faker';
import { createEmptyLensState } from '../helper';

function setupDashboardServicesApi(runtimeOverrides?: Partial<LensRuntimeState>) {
  const services = makeEmbeddableServices();
  const internalApiMock = getLensInternalApiMock();
  const runtimeState = getLensRuntimeStateMock(runtimeOverrides);
  const stateManagementConfig = initializeStateManagement(runtimeState, internalApiMock);
  const { api } = initializeDashboardServices(
    runtimeState,
    () => runtimeState,
    internalApiMock,
    stateManagementConfig,
    {},
    services
  );
  return api;
}

describe('Transformation API', () => {
  it("should not save to library if there's already a saveObjectId", async () => {
    const api = setupDashboardServicesApi({ savedObjectId: faker.string.uuid() });
    expect(await api.canLinkToLibrary()).toBe(false);
  });

  it("should save to library if there's no saveObjectId declared", async () => {
    const api = setupDashboardServicesApi();
    expect(await api.canLinkToLibrary()).toBe(true);
  });

  it('should not save to library for ES|QL chart types', async () => {
    // setup a state with an ES|QL query
    const api = setupDashboardServicesApi(
      createEmptyLensState('lnsXY', faker.lorem.words(), faker.lorem.text(), {
        esql: 'FROM index',
      })
    );
    expect(await api.canLinkToLibrary()).toBe(false);
  });
});
