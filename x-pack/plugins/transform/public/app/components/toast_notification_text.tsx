/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CoreStart } from 'src/core/public';

import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

const MAX_SIMPLE_MESSAGE_LENGTH = 140;

// Because of the use of `toMountPoint`, `useKibanaContext` doesn't work via `useAppDependencies`.
// That's why we need to pass in `overlays` as a prop cannot get it via context.
interface ToastNotificationTextProps {
  overlays: CoreStart['overlays'];
  text: any;
  previewTextLength?: number;
}

export const ToastNotificationText: FC<ToastNotificationTextProps> = ({
  overlays,
  text,
  previewTextLength,
}) => {
  if (typeof text === 'string' && text.length <= MAX_SIMPLE_MESSAGE_LENGTH) {
    return text;
  }

  if (
    typeof text === 'object' &&
    typeof text.message === 'string' &&
    text.message.length <= MAX_SIMPLE_MESSAGE_LENGTH
  ) {
    return text.message;
  }

  const unformattedText = text.message ? text.message : text;
  const formattedText = typeof unformattedText === 'object' ? JSON.stringify(text, null, 2) : text;
  const textLength = previewTextLength ?? 140;
  const previewText = `${formattedText.substring(0, textLength)}${
    formattedText.length > textLength ? ' ...' : ''
  }`;

  const openModal = () => {
    const modal = overlays.openModal(
      toMountPoint(
        <EuiModal onClose={() => modal.close()}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.transform.toastText.modalTitle', {
                defaultMessage: 'Error details',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
              {formattedText}
            </EuiCodeBlock>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => modal.close()}>
              {i18n.translate('xpack.transform.toastText.closeModalButtonText', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      )
    );
  };

  return (
    <>
      <pre>{previewText}</pre>
      <EuiButtonEmpty onClick={openModal}>
        {i18n.translate('xpack.transform.toastText.openModalButtonText', {
          defaultMessage: 'View details',
        })}
      </EuiButtonEmpty>
    </>
  );
};
