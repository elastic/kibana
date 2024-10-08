/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import pMap from 'p-map';
import { DeleteParamsResponse } from '../../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { deleteMonitor } from '../delete_monitor';

export const deleteSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/_bulk_delete',
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string(), {
          minSize: 1,
        }),
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response } = routeContext;

    const { ids: idsToDelete } = request.body || {};

    const result: DeleteParamsResponse[] = [];

    await pMap(idsToDelete, async (id) => {
      try {
        const { errors, res } = await deleteMonitor({
          routeContext,
          monitorId: id,
        });
        if (res) {
          return res;
        }

        if (errors && errors.length > 0) {
          return response.ok({
            body: { message: 'error pushing monitor to the service', attributes: { errors } },
          });
        }

        result.push({ id, deleted: true });
      } catch (getErr) {
        if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
          result.push({ id, deleted: false, error: `Monitor id ${id} not found!` });
        } else {
          throw getErr;
        }
      }
    });

    return result;
  },
});
