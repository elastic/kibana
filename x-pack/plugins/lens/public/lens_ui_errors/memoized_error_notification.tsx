/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';

const [getMemoizedErrorNotification, setMemoizedErrorNotification] = createGetterSetter<
  ReturnType<typeof memoizedErrorNotificationFactory>
>('MemoizedErrorNotification', false);

const memoizedErrorNotificationFactory = (coreStart: CoreStart) => {
  const showedErrors = new Map<string, boolean>();
  return (error: Error) => {
    const { message } = error;

    if (message) {
      if (!showedErrors.has(message)) {
        coreStart.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.lens.uiErrors.unexpectedError', {
            defaultMessage: 'An unexpected error occurred.',
          }),
        });
        showedErrors.set(message, true);
      }
    }
  };
};

const showMemoizedErrorNotification = (error: Error) => getMemoizedErrorNotification()?.(error);

const initMemoizedErrorNotification = (coreStart: CoreStart) => {
  setMemoizedErrorNotification(memoizedErrorNotificationFactory(coreStart));
};

export { showMemoizedErrorNotification, initMemoizedErrorNotification };
