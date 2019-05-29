/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { toastNotifications } from 'ui/notify';
import { formatMsg } from 'ui/notify/lib/format_msg';

const getToast = (err, opts = {}) => {
  const errData = get(err, 'response') || err;
  const errMsg = formatMsg(errData);
  const { title, ...rest } = opts;
  let text = null;

  if (title) {
    text = errMsg;
  }

  return {
    ...rest,
    title: title || errMsg,
    text,
  };
};

export const notify = {
  /*
   * @param {(string | Object)} err: message or Error object
   * @param {Object} opts: option to override toast title or icon, see https://github.com/elastic/kibana/blob/master/src/legacy/ui/public/notify/toasts/TOAST_NOTIFICATIONS.md
   */
  error(err, opts) {
    toastNotifications.addDanger(getToast(err, opts));
  },
  warning(err, opts) {
    toastNotifications.addWarning(getToast(err, opts));
  },
  info(err, opts) {
    toastNotifications.add(getToast(err, opts));
  },
  success(err, opts) {
    toastNotifications.addSuccess(getToast(err, opts));
  },
};
