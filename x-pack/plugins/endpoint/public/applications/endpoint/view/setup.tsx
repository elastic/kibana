/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import {
  EuiToast,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiModalFooter,
  EuiCallOut,
} from '@elastic/eui';
import { NotificationsStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { IngestManagerStart } from '../../../../../ingest_manager/public';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';

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
  const errorTitle = (
    <FormattedMessage
      id="xpack.endpoint.ingestErrorHeader"
      defaultMessage="App failed to initialize"
    />
  );

  const toastError = (
    <FormattedMessage
      id="xpack.endpoint.ingestErrorText"
      defaultMessage="Ingest Manager failed during its setup."
    />
  );

  const [ingestInitError, setIngestInitError] = React.useState<string | undefined>(undefined);
  const unknownError = 'Ingest Manager failed to initialize for an unknown reason';

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
          setIngestInitError(response.error.message);
        } else if (!response.data?.isInitialized) {
          setIngestInitError(unknownError);
        }
      })
      .catch(error => {
        if (typeof error === 'string') {
          setIngestInitError(error);
        } else if (error?.message && typeof error.message === 'string') {
          setIngestInitError(error.message);
        } else {
          setIngestInitError(unknownError);
        }
      });

    if (ingestInitError) {
      /* notifications.toasts.add({
          title: 'App failed to initialize',
          text: toMountPoint(
            <div>
              <p>{toastError}</p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={showFullError} size="s" color="danger">
                    See full error
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              {modal}
            </div>
          ),
          color: 'danger',
          iconType: 'alert',
        });*/
      notifications.toasts.addDanger({
        title: 'App failed to initialize',
        text: ingestInitError,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isFullErrorVisible, setIsFullErrorVisible] = React.useState<boolean>(false);

  const closeFullError = () => setIsFullErrorVisible(false);
  const showFullError = () => setIsFullErrorVisible(true);
  let modal;

  if (isFullErrorVisible) {
    modal = (
      <EuiOverlayMask>
        <EuiModal onClose={closeFullError}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{errorTitle}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiCallOut title={toastError} color="danger" iconType="alert" />
            <EuiText>
              <p>
                <FormattedMessage id="xpack.endpoint.modalText" defaultMessage={ingestInitError} />
              </p>
            </EuiText>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={closeFullError} fill>
              Close
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  /* if (ingestInitError) {
    return (
      <div>
        <EuiToast title={errorTitle} color="danger" iconType="alert">
          <p>{toastError}</p>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={showFullError} size="s">
                See full error
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToast>
        {modal}
      </div>
    );
  }*/

  return null;
};
