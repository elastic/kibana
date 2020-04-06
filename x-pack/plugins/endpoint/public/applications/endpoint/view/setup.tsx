/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { SendRequestResponse } from 'src/plugins/es_ui_shared/public';
import { CreateFleetSetupResponse } from '../../../../../ingest_manager/common';
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
  React.useEffect(() => {
    const unknownError = i18n.translate('xpack.endpoint.ingestUnknownError', {
      defaultMessage: 'Ingest Manager failed to initialize for an unknown reason',
    });

    const sendToast = (text: string) => {
      const errorText = new Error(
        i18n.translate('xpack.endpoint.ingestToastMessage', {
          defaultMessage: 'Ingest Manager failed during its setup.',
        })
      );
      // we're leveraging the notification's error toast which is usually used for displaying stack traces of an
      // actually Error. Instead of displaying a stack trace we'll display the more detailed error text when the
      // user clicks `See the full error` button to see the modal
      errorText.stack = text;
      notifications.toasts.addError(errorText, {
        title: i18n.translate('xpack.endpoint.ingestToastTitle', {
          defaultMessage: 'App failed to initialize',
        }),
      });
    };

    (async () => {
      if (await isIngestManagerInitialized(ingestManager)) {
        return null;
      }
      let response: SendRequestResponse<CreateFleetSetupResponse, Error>;
      try {
        response = await ingestManager.setup();
      } catch (error) {
        if (typeof error === 'string') {
          sendToast(error);
        } else if (error?.message && typeof error.message === 'string') {
          sendToast(error.message);
        } else {
          sendToast(unknownError);
        }
        return null;
      }
      if (response.error) {
        sendToast(response.error.message);
      } else if (!response.data?.isInitialized) {
        sendToast(unknownError);
      }
    })();
  }, [ingestManager, notifications.toasts]);

  return null;
};
