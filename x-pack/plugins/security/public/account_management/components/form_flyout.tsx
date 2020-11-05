/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, FunctionComponent, MouseEventHandler } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyout,
  EuiFlyoutProps,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonProps,
  EuiButtonEmpty,
  EuiPortal,
} from '@elastic/eui';

export interface FormFlyoutProps extends Omit<EuiFlyoutProps, 'onSubmit'> {
  title: string;
  isLoading?: EuiButtonProps['isLoading'];
  onSubmit: MouseEventHandler;
  submitButtonText: string;
  submitButtonColor?: EuiButtonProps['color'];
}

export const FormFlyout: FunctionComponent<FormFlyoutProps> = ({
  title,
  submitButtonText,
  submitButtonColor,
  onSubmit,
  isLoading,
  children,
  ...rest
}) => {
  const submitButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (submitButton.current) {
      submitButton.current.focus();
    }
  }, []);

  const flyout = (
    <EuiFlyout {...rest}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" isDisabled={isLoading} onClick={rest.onClose}>
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.closeButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              buttonRef={submitButton}
              isLoading={isLoading}
              color={submitButtonColor}
              fill
              onClick={onSubmit}
            >
              {submitButtonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return rest.ownFocus ? <EuiPortal>{flyout}</EuiPortal> : flyout;
};

FormFlyout.defaultProps = {
  ownFocus: true,
};
