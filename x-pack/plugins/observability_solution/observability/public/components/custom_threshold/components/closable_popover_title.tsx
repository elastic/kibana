/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopoverTitle, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
}

export function ClosablePopoverTitle({ children, onClose }: ClosablePopoverTitleProps) {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="o11yClosablePopoverTitleButton"
            iconType="cross"
            color="danger"
            aria-label={i18n.translate(
              'xpack.observability.thresholdRule.closablePopoverTitle.closeLabel',
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
}
