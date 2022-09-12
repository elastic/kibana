/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { prebuiltSavedObjectsBulkDeleteUrl } from '../../../../../common/constants';
import { DELETE_SAVED_OBJECTS_FAILURE } from '../translations';

interface Options {
  templateName: string;
}

export const bulkDeletePrebuiltSavedObjects = async ({
  http,
  notifications,
  errorMessage,
  options,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  errorMessage?: string;
  options: Options;
}) => {
  const res = await http
    .post(prebuiltSavedObjectsBulkDeleteUrl(options.templateName))
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? DELETE_SAVED_OBJECTS_FAILURE,
        text: e?.body?.message,
      });
    });

  return res;
};
