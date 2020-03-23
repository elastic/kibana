/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { txtClose } from './i18n';

export interface FlyoutFrameProps {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
}

/**
 * @todo This component can be moved to `kibana_react`.
 */
export const FlyoutFrame: React.FC<FlyoutFrameProps> = ({
  title = '',
  footer,
  onClose,
  children,
}) => {
  const headerFragment = title && (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h1>{title}</h1>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const footerFragment = (onClose || footer) && (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onClose && (
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="flyoutCloseButton"
            >
              {txtClose}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj="flyoutFooter">
          {footer}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <>
      {headerFragment}
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      {footerFragment}
    </>
  );
};
