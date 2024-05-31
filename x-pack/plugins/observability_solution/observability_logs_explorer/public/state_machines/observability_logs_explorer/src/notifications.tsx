/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const createRequestFeedbackNotifier = (toasts: IToasts) => () => {
  toasts.addInfo({
    title: i18n.translate('xpack.observabilityLogsExplorer.feedbackToast.title', {
      defaultMessage: 'Tell us what you think!',
    }),
    text: mountReactNode(<></>),
    iconType: 'editorComment',
  });
};
