/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeParams, FindResult } from '../../../../../alerting/server';
import { __DO_NOT_USE__NOTIFICATIONS_ID } from '../../../../common/constants';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__FindNotificationParams } from './do_not_use_types';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__getFilter = (filter: string | null | undefined) => {
  if (filter == null) {
    return `alert.attributes.alertTypeId: ${__DO_NOT_USE__NOTIFICATIONS_ID}`;
  } else {
    return `alert.attributes.alertTypeId: ${__DO_NOT_USE__NOTIFICATIONS_ID} AND ${filter}`;
  }
};

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__findNotifications = async ({
  rulesClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
}: __DO_NOT_USE__FindNotificationParams): Promise<FindResult<AlertTypeParams>> =>
  rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: __DO_NOT_USE__getFilter(filter),
      sortOrder,
      sortField,
    },
  });
