/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse } from '@kbn/core/server';
import { SyntheticsRestApiRouteFactory } from '../../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { monitorAttributes, syntheticsMonitorType } from '../../../../common/types/saved_objects';

const aggs = {
  locations: {
    terms: {
      field: `${monitorAttributes}.locations.id`,
      size: 10000,
    },
  },
};

export const getLocationMonitors: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,

  validate: {},
  handler: async ({
    savedObjectsClient: _s,
    uptimeEsClient: es,
  }): Promise<IKibanaResponse<any>> => {
    return {
      options: {},
      payload: await _s?.find<unknown, typeof aggs>({
        type: syntheticsMonitorType,
        perPage: 0,
        aggs,
      }),
      status: 200,
    };
  },
});
