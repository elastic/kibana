/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { of } from 'rxjs';
import { action } from '@storybook/addon-actions';
import type { NotificationsStart } from '@kbn/core/public';

const handler = (type: string, ...rest: any[]) => {
  action(`${type} Toast`)(rest);
  return { id: uuid() };
};

const notifications: NotificationsStart = {
  toasts: {
    add: (params) => handler('add', params),
    addDanger: (params) => handler('danger', params),
    addError: (params) => handler('error', params),
    addWarning: (params) => handler('warning', params),
    addSuccess: (params) => handler('success', params),
    addInfo: (params) => handler('info', params),
    remove: () => {},
    get$: () => of([]),
  },
};

export const getNotifications = () => notifications;
