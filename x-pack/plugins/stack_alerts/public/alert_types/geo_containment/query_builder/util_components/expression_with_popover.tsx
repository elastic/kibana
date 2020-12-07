/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, useState } from 'react';
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ExpressionWithPopover: ({
  popoverContent,
  expressionDescription,
  defaultValue,
  value,
  isInvalid,
}: {
  popoverContent: ReactNode;
  expressionDescription: ReactNode;
  defaultValue?: ReactNode;
  value?: ReactNode;
  isInvalid?: boolean;
}) => JSX.Element = ({ popoverContent, expressionDescription, defaultValue, value, isInvalid }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiPopover
      id="popoverForExpression"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectIndexExpression"
          description={expressionDescription}
          value={value || defaultValue}
          isActive={popoverOpen}
          onClick={() => setPopoverOpen(true)}
          isInvalid={isInvalid}
        />
      }
      isOpen={popoverOpen}
      closePopover={() => setPopoverOpen(false)}
      ownFocus
      anchorPosition="downLeft"
      zIndex={8000}
      display="block"
    >
      <div style={{ width: '450px' }}>
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>{expressionDescription}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closePopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.geoContainment.ui.expressionPopover.closePopoverLabel',
                  {
                    defaultMessage: 'Close',
                  }
                )}
                onClick={() => setPopoverOpen(false)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        {popoverContent}
      </div>
    </EuiPopover>
  );
};
