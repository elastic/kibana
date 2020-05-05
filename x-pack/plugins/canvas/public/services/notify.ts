/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { CanvasServiceFactory } from '.';
import { formatMsg } from '../../../../../src/plugins/kibana_legacy/public';
import { ToastInputFields } from '../../../../../src/core/public';

const getToast = (err: Error | string, opts: ToastInputFields = {}) => {
  const errData = (get(err, 'response') || err) as Error | string;
  const errMsg = formatMsg(errData);
  const { title, ...rest } = opts;
  let text;

  if (title) {
    text = errMsg;
  }

  return {
    ...rest,
    title: title || errMsg,
    text,
  };
};

interface NotifyService {
  error: (err: string | Error, opts?: ToastInputFields) => void;
  warning: (err: string | Error, opts?: ToastInputFields) => void;
  info: (err: string | Error, opts?: ToastInputFields) => void;
  success: (err: string | Error, opts?: ToastInputFields) => void;
}

export const notifyServiceFactory: CanvasServiceFactory<NotifyService> = (setup, start) => {
  const toasts = start.notifications.toasts;

  return {
    /*
     * @param {(string | Object)} err: message or Error object
     * @param {Object} opts: option to override toast title or icon, see https://github.com/elastic/kibana/blob/master/src/legacy/ui/public/notify/toasts/TOAST_NOTIFICATIONS.md
     */
    error(err, opts) {
      toasts.addDanger(getToast(err, opts));
    },
    warning(err, opts) {
      toasts.addWarning(getToast(err, opts));
    },
    info(err, opts) {
      toasts.add(getToast(err, opts));
    },
    success(err, opts) {
      toasts.addSuccess(getToast(err, opts));
    },
  };
};
