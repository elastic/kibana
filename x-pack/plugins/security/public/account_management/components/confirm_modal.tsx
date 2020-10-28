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
  confirmButtonColor?: EuiButtonProps['color'];
  confirmButtonText: string;
  isLoading?: EuiButtonProps['isLoading'];
  onCancel(): void;
  onConfirm(): void;
  ownFocus?: boolean;
}

export const ConfirmModal: FunctionComponent<ConfirmModalProps> = ({
  children,
  confirmButtonColor,
  confirmButtonText,
  isLoading,
  onCancel,
  onConfirm,
  ownFocus,
  title,
  ...rest
}) => {
  const modal = (
    <EuiModal onClose={onCancel} {...rest}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="right" isDisabled={isLoading} onClick={onCancel}>
              <FormattedMessage
                id="xpack.security.accountManagement.invalidateApiKey.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color={confirmButtonColor} fill isLoading={isLoading} onClick={onConfirm}>
              {confirmButtonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );

  return ownFocus ? <EuiOverlayMask onClick={onCancel}>{modal}</EuiOverlayMask> : modal;
};

ConfirmModal.defaultProps = {
  ownFocus: true,
};
