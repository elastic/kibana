/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import { createFilterSchema, filterIdSchema, updateFilterSchema } from './schemas/filters_schema';
import type { FormFilter, UpdateFilter } from '../models/filter';
import { FilterManager } from '../models/filter';
import type { MlClient } from '../lib/ml_client';

// TODO - add function for returning a list of just the filter IDs.
// TODO - add function for returning a list of filter IDs plus item count.
function getAllFilters(mlClient: MlClient) {
  const mgr = new FilterManager(mlClient);
  return mgr.getAllFilters();
}

function getAllFilterStats(mlClient: MlClient) {
  const mgr = new FilterManager(mlClient);
  return mgr.getAllFilterStats();
}

function getFilter(mlClient: MlClient, filterId: string) {
  const mgr = new FilterManager(mlClient);
  return mgr.getFilter(filterId);
}

function newFilter(mlClient: MlClient, filter: FormFilter) {
  const mgr = new FilterManager(mlClient);
  return mgr.newFilter(filter);
}

function updateFilter(mlClient: MlClient, filterId: string, filter: UpdateFilter) {
  const mgr = new FilterManager(mlClient);
  return mgr.updateFilter(filterId, filter);
}

function deleteFilter(mlClient: MlClient, filterId: string) {
  const mgr = new FilterManager(mlClient);
  return mgr.deleteFilter(filterId);
}

export function filtersRoutes({ router, routeGuard }: RouteInitialization) {
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/filters`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetFilters'],
        },
      },
      summary: 'Gets filters',
      description:
        'Retrieves the list of filters which are used for custom rules in anomaly detection. Sets the size limit explicitly to return a maximum of 1000.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const resp = await getAllFilters(mlClient);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/filters/{filterId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetFilters'],
        },
      },
      summary: 'Gets filter by ID',
      description: 'Retrieves the filter with the specified ID.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: filterIdSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getFilter(mlClient, request.params.filterId);
          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/filters`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateFilter'],
        },
      },
      summary: 'Creates a filter',
      description: 'Instantiates a filter, for use by custom rules in anomaly detection.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: createFilterSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = request.body;
          const resp = await newFilter(mlClient, body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/filters/{filterId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateFilter'],
        },
      },
      summary: 'Updates a filter',
      description: 'Updates the description of a filter, adds items or removes items.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: filterIdSchema,
            body: updateFilterSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { filterId } = request.params;
          const body = request.body;
          const resp = await updateFilter(mlClient, filterId, body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/filters/{filterId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteFilter'],
        },
      },
      summary: 'Deletes a filter',
      description: 'Deletes the filter with the specified ID.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: filterIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { filterId } = request.params;
          const resp = await deleteFilter(mlClient, filterId);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/filters/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetFilters'],
        },
      },
      summary: 'Gets filters stats',
      description:
        'Retrieves the list of filters which are used for custom rules in anomaly detection, with stats on the list of jobs and detectors which are using each filter.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const resp = await getAllFilterStats(mlClient);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
