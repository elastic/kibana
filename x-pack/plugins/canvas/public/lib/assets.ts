/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { AssetType, CanvasAsset } from '../../types';
import { getId } from './get_id';
import { getCanvasNotifyService } from '../services/canvas_notify_service';

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

export const createAsset = (type: AssetType['type'], content: AssetType['value']): CanvasAsset => ({
  id: getId('asset'),
  type,
  value: content,
  '@created': new Date().toISOString(),
});

export const notifyError = (err: any) => {
  const { error: notifyErrorFn } = getCanvasNotifyService();
  const statusCode = err.response && err.response.status;
  switch (statusCode) {
    case 400:
      return notifyErrorFn(err.response, {
        title: strings.getSaveFailureTitle(),
      });
    case 413:
      return notifyErrorFn(strings.getTooLargeErrorMessage(), {
        title: strings.getSaveFailureTitle(),
      });
    default:
      return notifyErrorFn(err, {
        title: strings.getUpdateFailureTitle(),
      });
  }
};
