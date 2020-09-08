/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getToastNotifications } from '../../util/dependency_cache';
import { MLRequestFailure } from '../../util/ml_error';
import { extractErrorMessage } from '../../../../common/util/errors';

function errorNotify(error, resp) {
  let err = null;
  if (typeof error === 'object') {
    err = new Error(extractErrorMessage(error));
  } else if (typeof error === 'object' && error.message !== undefined) {
    err = new Error(error.message);
  } else {
    err = new Error(error);
  }

  const toastNotifications = getToastNotifications();
  toastNotifications.addError(new MLRequestFailure(err, resp ?? error), {
    title: i18n.translate('xpack.ml.messagebarService.errorTitle', {
      defaultMessage: 'An error has occurred',
    }),
  });
}

export const mlMessageBarService = {
  error: errorNotify,
};
