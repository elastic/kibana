/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonProps, EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent, RefObject } from 'react';
import React, { useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { useHtmlId } from './use_html_id';

export interface FormFlyoutProps extends Omit<EuiFlyoutProps, 'onClose'> {
  title: string;
  initialFocus?: RefObject<HTMLElement>;
  onCancel(): void;
  onSubmit(): void;
  submitButtonText: string;
  submitButtonColor?: EuiButtonProps['color'];
  isLoading?: EuiButtonProps['isLoading'];
  isDisabled?: EuiButtonProps['isDisabled'];
}

export const FormFlyout: FunctionComponent<FormFlyoutProps> = ({
  title,
  submitButtonText,
  submitButtonColor,
  onCancel,
  onSubmit,
  isLoading,
  isDisabled,
  children,
  initialFocus,
  ...rest
}) => {
  useEffect(() => {
    if (initialFocus && initialFocus.current) {
      initialFocus.current.focus();
    }
  }, [initialFocus]);

  const titleId = useHtmlId('formFlyout', 'title');

  return (
    <EuiPortal>
      <EuiFlyout onClose={onCancel} aria-labelledby={titleId} {...rest}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{children}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="formFlyoutCancelButton"
                flush="right"
                isDisabled={isLoading}
                onClick={onCancel}
              >
                <FormattedMessage
                  id="xpack.security.formFlyout.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="formFlyoutSubmitButton"
                isLoading={isLoading}
                isDisabled={isDisabled}
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
    </EuiPortal>
  );
};
