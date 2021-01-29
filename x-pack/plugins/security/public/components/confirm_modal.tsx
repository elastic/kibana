/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiButton,
  EuiButtonProps,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalProps,
  EuiOverlayMask,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface ConfirmModalProps extends Omit<EuiModalProps, 'onClose' | 'initialFocus'> {
  confirmButtonText: string;
  confirmButtonColor?: EuiButtonProps['color'];
  isLoading?: EuiButtonProps['isLoading'];
  isDisabled?: EuiButtonProps['isDisabled'];
  onCancel(): void;
  onConfirm(): void;
  ownFocus?: boolean;
}

/**
 * Component that renders a confirmation modal similar to `EuiConfirmModal`, except that
 * it adds `isLoading` prop, which renders a loading spinner and disables action buttons,
 * and `ownFocus` prop to render overlay mask.
 */
export const ConfirmModal: FunctionComponent<ConfirmModalProps> = ({
  children,
  confirmButtonColor: buttonColor,
  confirmButtonText,
  isLoading,
  isDisabled,
  onCancel,
  onConfirm,
  ownFocus = true,
  title,
  ...rest
}) => {
  const modal = (
    <EuiModal role="dialog" title={title} onClose={onCancel} {...rest}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody data-test-subj="confirmModalBodyText">{children}</EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="confirmModalCancelButton"
              flush="right"
              isDisabled={isLoading}
              onClick={onCancel}
            >
              <FormattedMessage
                id="xpack.security.confirmModal.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="confirmModalConfirmButton"
              color={buttonColor}
              fill
              isLoading={isLoading}
              isDisabled={isDisabled}
              onClick={onConfirm}
            >
              {confirmButtonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );

  return ownFocus ? (
    <EuiOverlayMask onClick={!isLoading ? onCancel : undefined}>{modal}</EuiOverlayMask>
  ) : (
    modal
  );
};
