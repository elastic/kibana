/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { useNotifyService, useWorkpadService } from '../../../services';

export const useFindWorkpads = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();

  return useCallback(
    async (text = '') => {
      try {
        return await workpadService.find(text);
      } catch (err) {
        notifyService.error(err, { title: errors.getFindFailureErrorMessage() });
      }
    },
    [notifyService, workpadService]
  );
};

const errors = {
  getFindFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useFindWorkpads.findFailureErrorMessage', {
      defaultMessage: `Couldn't find workpad`,
    }),
};
