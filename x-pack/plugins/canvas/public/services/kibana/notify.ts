/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

import { formatMsg } from '../../lib/format_msg';
import { ToastInputFields } from '../../../../../../src/core/public';
import { CanvasStartDeps } from '../../plugin';
import { CanvasNotifyService } from '../notify';

export type CanvasNotifyServiceFactory = KibanaPluginServiceFactory<
  CanvasNotifyService,
  CanvasStartDeps
>;

const getToast = (err: Error | string, opts: ToastInputFields = {}) => {
  const errData = (get(err, 'response') || err) as Error | string;
  const errBody = get(err, 'body', undefined);
  const errMsg = formatMsg(errBody !== undefined ? err : errData);
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

export const notifyServiceFactory: CanvasNotifyServiceFactory = ({ coreStart }) => {
  const toasts = coreStart.notifications.toasts;

  return {
    /*
     * @param {(string | Object)} err: message or Error object
     * @param {Object} opts: option to override toast title or icon, see https://github.com/elastic/kibana/blob/main/src/legacy/ui/public/notify/toasts/TOAST_NOTIFICATIONS.md
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
