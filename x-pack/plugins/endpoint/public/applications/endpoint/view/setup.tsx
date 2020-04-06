/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { IngestManagerStart } from '../../../../../ingest_manager/public';

async function isIngestManagerInitialized(ingestManager: IngestManagerStart) {
  const resp = await ingestManager.isInitialized();
  if (resp.error) {
    return false;
  }
  return resp.data?.isInitialized || false;
}

export const Setup: React.FunctionComponent<{
  ingestManager: IngestManagerStart;
  notifications: NotificationsStart;
}> = ({ ingestManager, notifications }) => {
  const unknownError = 'Ingest Manager failed to initialize for an unknown reason';

  const sendToast = (text: string) => {
    const errorText = new Error(
      i18n.translate('xpack.endpoint.ingestToastMessage', {
        defaultMessage: 'Ingest Manager failed during its setup.',
      })
    );
    errorText.stack = text;
    notifications.toasts.addError(errorText, {
      title: i18n.translate('xpack.endpoint.ingestToastTitle', {
        defaultMessage: 'App failed to initialize',
      }),
    });
  };

  React.useEffect(() => {
    (async () => {
      if (await isIngestManagerInitialized(ingestManager)) {
        return null;
      }
    })();

    ingestManager
      .setup()
      .then(response => {
        if (response.error) {
          sendToast(response.error.message);
        } else if (!response.data?.isInitialized) {
          sendToast(unknownError);
        }
      })
      .catch(error => {
        if (typeof error === 'string') {
          sendToast(error);
        } else if (error?.message && typeof error.message === 'string') {
          sendToast(error.message);
        } else {
          sendToast(unknownError);
        }
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
