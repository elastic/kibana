/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { AGENT_POLICY_API_ROUTES } from '../../constants';
import {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  GetK8sManifestRequestSchema,
  BulkGetAgentPoliciesRequestSchema,
} from '../../types';

import { K8S_API_ROUTES } from '../../../common/constants';

import {
  getAgentPoliciesHandler,
  getOneAgentPolicyHandler,
  createAgentPolicyHandler,
  updateAgentPolicyHandler,
  copyAgentPolicyHandler,
  deleteAgentPoliciesHandler,
  getFullAgentPolicy,
  downloadFullAgentPolicy,
  downloadK8sManifest,
  getK8sManifest,
  bulkGetAgentPoliciesHandler,
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List - Fleet Server needs access to run setup
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Get agent policies`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentPoliciesRequestSchema },
      },
      getAgentPoliciesHandler
    );

  // Bulk GET
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.BULK_GET_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Bulk get agent policies`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: BulkGetAgentPoliciesRequestSchema },
      },
      bulkGetAgentPoliciesHandler
    );

  // Get one
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Get an agent policy`,
      description: `Get an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneAgentPolicyRequestSchema },
      },
      getOneAgentPolicyHandler
    );

  // Create
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Create an agent policy`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: CreateAgentPolicyRequestSchema },
      },
      createAgentPolicyHandler
    );

  // Update
  router.versioned
    .put({
      path: AGENT_POLICY_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Update an agent policy`,
      description: `Update an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: UpdateAgentPolicyRequestSchema },
      },
      updateAgentPolicyHandler
    );

  // Copy
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.COPY_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Copy an agent policy`,
      description: `Copy an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: CopyAgentPolicyRequestSchema },
      },
      copyAgentPolicyHandler
    );

  // Delete
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Delete an agent policy`,
      description: `Delete an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteAgentPolicyRequestSchema },
      },
      deleteAgentPoliciesHandler
    );

  // Get one full agent policy
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      summary: `Get a full agent policy`,
      description: `Get a full agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetFullAgentPolicyRequestSchema },
      },
      getFullAgentPolicy
    );

  // Download one full agent policy
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      enableQueryVersion: true,
      summary: `Download an agent policy`,
      description: `Download an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetFullAgentPolicyRequestSchema },
      },
      downloadFullAgentPolicy
    );

  // Get agent manifest
  router.versioned
    .get({
      path: K8S_API_ROUTES.K8S_INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      summary: `Get a full K8s agent manifest`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetK8sManifestRequestSchema },
      },
      getK8sManifest
    );

  // Download agent manifest
  router.versioned
    .get({
      path: K8S_API_ROUTES.K8S_DOWNLOAD_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      enableQueryVersion: true,
      summary: `Download an agent manifest`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetK8sManifestRequestSchema },
      },
      downloadK8sManifest
    );
};
