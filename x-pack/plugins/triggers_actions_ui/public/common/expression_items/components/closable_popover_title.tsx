/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopoverTitle, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
}

export const ClosablePopoverTitle = ({ children, onClose }: ClosablePopoverTitleProps) => {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.common.expressionItems.components.closablePopoverTitle.closeLabel',
              {
                defaultMessage: 'Close',
              }
            )}
            onClick={() => onClose()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
