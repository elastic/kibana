/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { InvalidLocationError } from '../../synthetics_service/project_monitor/normalizers/common_fields';
import { AddEditMonitorAPI, CreateMonitorPayLoad } from './add_monitor/add_monitor_api';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { normalizeAPIConfig, validateMonitor } from './monitor_validation';
import { mapSavedObjectToMonitor } from './helper';

export const addSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {},
  validation: {
    request: {
      body: schema.any(),
      query: schema.object({
        id: schema.maybe(schema.string()),
        preserve_namespace: schema.maybe(schema.boolean()),
        gettingStarted: schema.maybe(schema.boolean()),
      }),
    },
  },
  writeAccess: true,
  handler: async (routeContext): Promise<any> => {
    const { request, response, server } = routeContext;
    // usually id is auto generated, but this is useful for testing
    const { id } = request.query;

    const addMonitorAPI = new AddEditMonitorAPI(routeContext);

    const {
      locations,
      private_locations: privateLocations,
      ...monitor
    } = request.body as CreateMonitorPayLoad;

    try {
      const { errorMessage: unsupportedKeysErrors, formattedConfig } = normalizeAPIConfig(
        request.body as CreateMonitorPayLoad
      );
      if (unsupportedKeysErrors) {
        return response.badRequest({
          body: {
            message: unsupportedKeysErrors,
            attributes: { details: unsupportedKeysErrors },
          },
        });
      }

      const monitorWithDefaults = await addMonitorAPI.normalizeMonitor(formattedConfig!);

      const validationResult = validateMonitor(monitorWithDefaults);

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details } = validationResult;
        return response.badRequest({
          body: { message, attributes: { details, payload: monitor } },
        });
      }

      const normalizedMonitor = validationResult.decodedMonitor;

      const nameError = await addMonitorAPI.validateUniqueMonitorName(normalizedMonitor.name);
      if (nameError) {
        return response.badRequest({
          body: { message: nameError, attributes: { details: nameError } },
        });
      }

      const { errors, newMonitor } = await addMonitorAPI.syncNewMonitor({
        id,
        normalizedMonitor,
      });

      if (errors && errors.length > 0) {
        return {
          message: 'error pushing monitor to the service',
          attributes: { errors },
          id: newMonitor.id,
        };
      }
      addMonitorAPI.initDefaultAlerts(newMonitor.attributes.name);
      addMonitorAPI.setupGettingStarted(newMonitor.id);

      return mapSavedObjectToMonitor(newMonitor);
    } catch (getErr) {
      server.logger.error(getErr);
      if (getErr instanceof InvalidLocationError) {
        return response.badRequest({ body: { message: getErr.message } });
      }
      if (SavedObjectsErrorHelpers.isForbiddenError(getErr)) {
        return response.forbidden({ body: getErr });
      }

      return response.customError({
        body: { message: getErr.message },
        statusCode: 500,
      });
    }
  },
});
