/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

// @ts-expect-error
import { getDefaultWorkpad } from '../../../state/defaults';
import { useNotifyService, useWorkpadService } from '../../../services';

import type { CanvasWorkpad } from '../../../../types';

export const useImportWorkpad = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();
  const history = useHistory();

  return useCallback(
    async (workpad: CanvasWorkpad) => {
      try {
        const importedWorkpad = await workpadService.import(workpad);
        history.push(`/workpad/${importedWorkpad.id}/page/1`);
      } catch (err) {
        notifyService.error(err, {
          title: errors.getUploadFailureErrorMessage(),
        });
      }
      return;
    },
    [notifyService, history, workpadService]
  );
};

const errors = {
  getUploadFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useUploadWorkpad.uploadFailureErrorMessage', {
      defaultMessage: `Couldn't upload workpad`,
    }),
};
