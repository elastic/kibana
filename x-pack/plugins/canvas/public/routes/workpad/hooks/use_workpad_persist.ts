/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { CanvasWorkpad, State } from '../../../../types';
import { getWorkpad, getFullWorkpadPersisted } from '../../../state/selectors/workpad';
import { canUserWrite } from '../../../state/selectors/app';
import { getAssetIds } from '../../../state/selectors/assets';
import { useWorkpadService, useNotifyService } from '../../../services';

const strings = {
  getSaveFailureTitle: () =>
    i18n.translate('xpack.canvas.error.esPersist.saveFailureTitle', {
      defaultMessage: "Couldn't save your changes to Elasticsearch",
    }),
  getTooLargeErrorMessage: () =>
    i18n.translate('xpack.canvas.error.esPersist.tooLargeErrorMessage', {
      defaultMessage:
        'The server gave a response that the workpad data was too large. This usually means uploaded image assets that are too large for Kibana or a proxy. Try removing some assets in the asset manager.',
    }),
  getUpdateFailureTitle: () =>
    i18n.translate('xpack.canvas.error.esPersist.updateFailureTitle', {
      defaultMessage: "Couldn't update workpad",
    }),
};

export const useWorkpadPersist = () => {
  const service = useWorkpadService();
  const notifyService = useNotifyService();
  const notifyError = useCallback(
    (err: any) => {
      const statusCode = err.response && err.response.status;
      switch (statusCode) {
        case 400:
          return notifyService.error(err.response, {
            title: strings.getSaveFailureTitle(),
          });
        case 413:
          return notifyService.error(strings.getTooLargeErrorMessage(), {
            title: strings.getSaveFailureTitle(),
          });
        default:
          return notifyService.error(err, {
            title: strings.getUpdateFailureTitle(),
          });
      }
    },
    [notifyService]
  );

  // Watch for workpad state or workpad assets to change and then persist those changes
  const [workpad, assetIds, fullWorkpad, canWrite]: [
    CanvasWorkpad,
    Array<string | number>,
    CanvasWorkpad,
    boolean
  ] = useSelector((state: State) => [
    getWorkpad(state),
    getAssetIds(state),
    getFullWorkpadPersisted(state),
    canUserWrite(state),
  ]);

  const previousWorkpad = usePrevious(workpad);
  const previousAssetIds = usePrevious(assetIds);

  const workpadChanged = previousWorkpad && workpad !== previousWorkpad;
  const assetsChanged = previousAssetIds && !isEqual(assetIds, previousAssetIds);

  useEffect(() => {
    if (canWrite) {
      if (workpadChanged && assetsChanged) {
        service.update(workpad.id, fullWorkpad).catch(notifyError);
      }
      if (workpadChanged) {
        service.updateWorkpad(workpad.id, workpad).catch(notifyError);
      } else if (assetsChanged) {
        service.updateAssets(workpad.id, fullWorkpad.assets).catch(notifyError);
      }
    }
  }, [service, workpad, fullWorkpad, workpadChanged, assetsChanged, canWrite, notifyError]);
};
