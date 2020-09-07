/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getToastNotifications } from '../../util/dependency_cache';
import { MLRequestFailure } from '../../util/ml_error';
import { extractErrorMessage } from '../../../../common/util/errors';

function errorNotify(text, resp) {
  let err = null;
  if (typeof text === 'object') {
    err = new Error(extractErrorMessage(text));
  } else if (typeof text === 'object' && text.message !== undefined) {
    err = new Error(text.message);
  } else {
    err = new Error(text);
  }

  const toastNotifications = getToastNotifications();
  toastNotifications.addError(new MLRequestFailure(err, resp ?? text), {
    title: i18n.translate('xpack.ml.messagebarService.errorTitle', {
      defaultMessage: 'An error has occurred',
    }),
  });
}

export const mlMessageBarService = {
  error: errorNotify,
};
