/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import fileSaver from 'file-saver';
import { i18n } from '@kbn/i18n';
import { useNotifyService, useWorkpadService } from '../../../services';
import { CanvasWorkpad } from '../../../../types';
import type { CanvasRenderedWorkpad } from '../../../../shareable_runtime/types';

const strings = {
  getDownloadFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.downloadWorkpad.downloadFailureErrorMessage', {
      defaultMessage: "Couldn't download workpad",
    }),
  getDownloadRenderedWorkpadFailureErrorMessage: () =>
    i18n.translate(
      'xpack.canvas.error.downloadWorkpad.downloadRenderedWorkpadFailureErrorMessage',
      {
        defaultMessage: "Couldn't download rendered workpad",
      }
    ),
};

export const useDownloadWorkpad = () => {
  const notifyService = useNotifyService();
  const workpadService = useWorkpadService();
  const download = useDownloadWorkpadBlob();

  return useCallback(
    async (workpadId: string) => {
      try {
        const workpad = await workpadService.get(workpadId);

        download(workpad, `canvas-workpad-${workpad.name}-${workpad.id}`);
      } catch (err) {
        notifyService.error(err, { title: strings.getDownloadFailureErrorMessage() });
      }
    },
    [workpadService, notifyService, download]
  );
};

export const useDownloadRenderedWorkpad = () => {
  const notifyService = useNotifyService();
  const download = useDownloadWorkpadBlob();

  return useCallback(
    async (workpad: CanvasRenderedWorkpad) => {
      try {
        download(workpad, `canvas-embed-workpad-${workpad.name}-${workpad.id}`);
      } catch (err) {
        notifyService.error(err, {
          title: strings.getDownloadRenderedWorkpadFailureErrorMessage(),
        });
      }
    },
    [notifyService, download]
  );
};

const useDownloadWorkpadBlob = () => {
  return useCallback((workpad: CanvasWorkpad | CanvasRenderedWorkpad, filename: string) => {
    const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
    fileSaver.saveAs(jsonBlob, `${filename}.json`);
  }, []);
};
