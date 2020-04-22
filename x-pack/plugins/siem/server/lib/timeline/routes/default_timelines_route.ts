/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_DEFAULT_URL } from '../../../../common/constants';
import { timelineSavedObjectType } from '../../../saved_objects';

export const defaultTimelinesRoute = (router: IRouter, config: ConfigType) => {
  router.get(
    {
      path: TIMELINE_DEFAULT_URL,
      validate: {},
      // options: {
      //   tags: ['access:siem'],
      // },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;

        const result = await savedObjectsClient.find({
          type: timelineSavedObjectType,
          perPage: 50,
        });

        const defaultTimeline = find(['attributes.title', ''], result.saved_objects);

        return response.ok({
          body: {
            data: {
              persistTimeline: defaultTimeline,
            },
          },
        });
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
