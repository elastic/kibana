/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import fileSaver from 'file-saver';
import { i18n } from '@kbn/i18n';
import { API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD } from '../../../../../../common/lib/constants';
import { ZIP } from '../../../../../../i18n/constants';

import { usePlatformService, useNotifyService, useWorkpadService } from '../../../../../services';
import { CanvasRenderedWorkpad } from '../../../../../../shareable_runtime/types';

const strings = {
  getDownloadRuntimeFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.downloadWorkpad.downloadRuntimeFailureErrorMessage', {
      defaultMessage: "Couldn't download Shareable Runtime",
    }),
  getDownloadZippedRuntimeFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.downloadWorkpad.downloadZippedRuntimeFailureErrorMessage', {
      defaultMessage: "Couldn't download ZIP file",
    }),
  getShareableZipErrorTitle: (workpadName: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareWebsiteErrorTitle', {
      defaultMessage:
        "Failed to create {ZIP} file for '{workpadName}'. The workpad may be too large. You'll need to download the files separately.",
      values: {
        ZIP,
        workpadName,
      },
    }),
};

export const useDownloadRuntime = () => {
  const platformService = usePlatformService();
  const notifyService = useNotifyService();

  const downloadRuntime = useCallback(() => {
    try {
      const path = `${platformService.getBasePath()}${API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD}`;
      window.open(path);
      return;
    } catch (err) {
      notifyService.error(err, { title: strings.getDownloadRuntimeFailureErrorMessage() });
    }
  }, [platformService, notifyService]);

  return downloadRuntime;
};

export const useDownloadZippedRuntime = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();

  const downloadZippedRuntime = useCallback(
    (workpad: CanvasRenderedWorkpad) => {
      const downloadZip = async () => {
        try {
          let runtimeZipBlob: Blob | undefined;
          try {
            runtimeZipBlob = await workpadService.getRuntimeZip(workpad);
          } catch (err) {
            notifyService.error(err, {
              title: strings.getShareableZipErrorTitle(workpad.name),
            });
          }

          if (runtimeZipBlob) {
            fileSaver.saveAs(runtimeZipBlob, 'canvas-workpad-embed.zip');
          }
        } catch (err) {
          notifyService.error(err, {
            title: strings.getDownloadZippedRuntimeFailureErrorMessage(),
          });
        }
      };

      downloadZip();
    },
    [notifyService, workpadService]
  );
  return downloadZippedRuntime;
};
