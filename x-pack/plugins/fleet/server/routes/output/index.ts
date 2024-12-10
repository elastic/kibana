/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { OUTPUT_API_ROUTES } from '../../constants';
import {
  DeleteOutputRequestSchema,
  GetLatestOutputHealthRequestSchema,
  GetOneOutputRequestSchema,
  GetOutputsRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';

import {
  deleteOutputHandler,
  getOneOuputHandler,
  getOutputsHandler,
  postOutputHandler,
  putOutputHandler,
  postLogstashApiKeyHandler,
  getLatestOutputHealth,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.LIST_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.readSettings || authz.fleet.readAgentPolicies;
      },
      summary: 'Get outputs',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOutputsRequestSchema },
      },
      getOutputsHandler
    );
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.readSettings || authz.fleet.readAgentPolicies;
      },
      summary: 'Get output',
      description: 'Get output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneOutputRequestSchema },
      },
      getOneOuputHandler
    );
  router.versioned
    .put({
      path: OUTPUT_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.allSettings || authz.fleet.allAgentPolicies;
      },
      summary: 'Update output',
      description: 'Update output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PutOutputRequestSchema },
      },
      putOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: 'Create output',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostOutputRequestSchema },
      },
      postOutputHandler
    );

  router.versioned
    .delete({
      path: OUTPUT_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: 'Delete output',
      description: 'Delete output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteOutputRequestSchema },
      },
      deleteOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.LOGSTASH_API_KEY_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: 'Generate a Logstash API key',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      postLogstashApiKeyHandler
    );

  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.GET_OUTPUT_HEALTH_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      summary: 'Get the latest output health',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetLatestOutputHealthRequestSchema },
      },
      getLatestOutputHealth
    );
};
