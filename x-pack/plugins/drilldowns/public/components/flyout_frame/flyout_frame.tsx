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
  title?: string;
  footer?: React.ReactNode;
  onClose?: () => void;
}

export const FlyoutFrame: React.FC<FlyoutFrameProps> = ({
  title = '',
  footer,
  onClose,
  children,
}) => {
  const headerFragment = title && (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="flyoutTitle">{title}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const footerFragment = (onClose || footer) && (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onClose && (
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              {txtClose}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{footer}</EuiFlexItem>
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
