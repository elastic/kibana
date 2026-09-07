/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SignificantEventsRouteRepository } from '@kbn/significant-events-plugin/server';
import type { CustomRoleScopedSupertestProvider } from '../../../services/custom_role_scoped_supertest';
import type { RoleScopedSupertestProvider } from '../../../services/role_scoped_supertest';
import type { RepositorySupertestClient } from '../../../../common/utils/server_route_repository/create_admin_service_from_repository';
import {
  getAdminApiClient,
  getCustomRoleApiClient,
  getEditorApiClient,
  getViewerApiClient,
} from '../../../../common/utils/server_route_repository/create_admin_service_from_repository';

export type SignificantEventsSupertestRepositoryClient =
  RepositorySupertestClient<SignificantEventsRouteRepository>;

export async function createStreamsRepositoryAdminClient(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<SignificantEventsSupertestRepositoryClient> {
  return getAdminApiClient<SignificantEventsRouteRepository>(st);
}

export async function createStreamsRepositoryEditorClient(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<SignificantEventsSupertestRepositoryClient> {
  return getEditorApiClient<SignificantEventsRouteRepository>(st);
}

export async function createStreamsRepositoryViewerClient(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<SignificantEventsSupertestRepositoryClient> {
  return getViewerApiClient<SignificantEventsRouteRepository>(st);
}

export async function createStreamsRepositoryCustomRoleClient(
  st: ReturnType<typeof CustomRoleScopedSupertestProvider>
): Promise<SignificantEventsSupertestRepositoryClient> {
  return getCustomRoleApiClient<SignificantEventsRouteRepository>(st);
}
