/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import type {
  NotificationsQueryParams,
  NotificationsSearchResponse,
} from '../../../../common/types/notifications';
import type { HttpService } from '../http_service';
import type {
  NotificationsCountQueryParams,
  NotificationsCountResponse,
} from '../../../../common/types/notifications';

export function notificationsProvider(httpService: HttpService) {
  return {
    findMessages(params: NotificationsQueryParams) {
      return httpService.http<NotificationsSearchResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/notifications`,
        method: 'GET',
        query: omitBy(params, (v) => !isDefined(v)),
        version: '1',
      });
    },

    countMessages$(params: NotificationsCountQueryParams) {
      return httpService.http$<NotificationsCountResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/notifications/count`,
        method: 'GET',
        query: omitBy(params, (v) => !isDefined(v)),
        version: '1',
      });
    },
  };
}
