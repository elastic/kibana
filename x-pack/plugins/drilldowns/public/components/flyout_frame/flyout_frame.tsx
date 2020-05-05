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
  EuiButtonIcon,
} from '@elastic/eui';
import { txtClose, txtBack } from './i18n';

export interface FlyoutFrameProps {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  banner?: React.ReactNode;
  onClose?: () => void;
  onBack?: () => void;
}

/**
 * @todo This component can be moved to `kibana_react`.
 */
export const FlyoutFrame: React.FC<FlyoutFrameProps> = ({
  title = '',
  footer,
  onClose,
  children,
  onBack,
  banner,
}) => {
  const headerFragment = (title || onBack) && (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <EuiFlexGroup alignItems="center" gutterSize={'s'} responsive={false}>
          {onBack && (
            <EuiFlexItem grow={false}>
              <div style={{ marginLeft: '-8px', marginTop: '-4px' }}>
                <EuiButtonIcon
                  color={'subdued'}
                  onClick={onBack}
                  iconType="arrowLeft"
                  aria-label={txtBack}
                />
              </div>
            </EuiFlexItem>
          )}
          {title && (
            <EuiFlexItem grow={true}>
              <h1>{title}</h1>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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
      <EuiFlyoutBody banner={banner}>{children}</EuiFlyoutBody>
      {footerFragment}
    </>
  );
};
