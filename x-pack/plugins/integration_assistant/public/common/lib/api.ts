/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  EcsMappingApiRequest,
  EcsMappingApiResponse,
  CategorizationApiRequest,
  CategorizationApiResponse,
  RelatedApiRequest,
  RelatedApiResponse,
  CheckPipelineApiRequest,
  CheckPipelineApiResponse,
  BuildIntegrationApiRequest,
  InstallPackageResponse,
  GetPackagesResponse,
} from '../../../common/types';
import {
  INTEGRATION_BUILDER_PATH,
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  CHECK_PIPELINE_PATH,
} from '../../../common';
import { FLEET_PACKAGES_PATH } from '../../../common/constants';

const defaultHeaders = {
  'Elastic-Api-Version': '1',
};
const fleetDefaultHeaders = {
  'Elastic-Api-Version': '2023-10-31',
};

export interface RequestDeps {
  http: HttpSetup;
  abortSignal: AbortSignal;
}

export const runEcsGraph = async (
  body: EcsMappingApiRequest,
  { http, abortSignal }: RequestDeps
): Promise<EcsMappingApiResponse> =>
  http.post<EcsMappingApiResponse>(ECS_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCategorizationGraph = async (
  body: CategorizationApiRequest,
  { http, abortSignal }: RequestDeps
): Promise<CategorizationApiResponse> =>
  http.post<CategorizationApiResponse>(CATEGORIZATION_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runRelatedGraph = async (
  body: RelatedApiRequest,
  { http, abortSignal }: RequestDeps
): Promise<RelatedApiResponse> =>
  http.post<RelatedApiResponse>(RELATED_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCheckPipelineResults = async (
  body: CheckPipelineApiRequest,
  { http, abortSignal }: RequestDeps
): Promise<CheckPipelineApiResponse> =>
  http.post<CheckPipelineApiResponse>(CHECK_PIPELINE_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runBuildIntegration = async (
  body: BuildIntegrationApiRequest,
  { http, abortSignal }: RequestDeps
): Promise<Blob> =>
  http.post<Blob>(INTEGRATION_BUILDER_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runInstallPackage = async (
  zipFile: Blob,
  { http, abortSignal }: RequestDeps
): Promise<InstallPackageResponse> =>
  http.post<InstallPackageResponse>(FLEET_PACKAGES_PATH, {
    headers: {
      ...fleetDefaultHeaders,
      Accept: 'application/zip',
      'Content-Type': 'application/zip',
    },
    body: zipFile,
    signal: abortSignal,
  });

export const getInstalledPackages = async ({
  http,
  abortSignal,
}: RequestDeps): Promise<GetPackagesResponse> =>
  http.get<GetPackagesResponse>(FLEET_PACKAGES_PATH, {
    headers: fleetDefaultHeaders,
    signal: abortSignal,
  });
