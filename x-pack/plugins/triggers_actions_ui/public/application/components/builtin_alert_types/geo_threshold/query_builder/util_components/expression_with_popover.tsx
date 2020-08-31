/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../../types';
import { GeoThresholdAlertParams } from '../../types';
import { AlertsContextValue } from '../../../../../context/alerts_context';

export const ExpressionWithPopover: ({
  popoverContent,
  expressionDescription,
  defaultValue,
  value,
}: {
  popoverContent: any;
  expressionDescription: any;
  defaultValue?: any;
  value?: any;
}) => JSX.Element = ({
  popoverContent,
  expressionDescription,
  defaultValue = '',
  value = defaultValue,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiPopover
      id="popoverForExpression"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectIndexExpression"
          description={expressionDescription}
          value={value}
          isActive={popoverOpen}
          onClick={() => setPopoverOpen(true)}
          isInvalid={false /* TODO: set valid criteria */}
        />
      }
      isOpen={popoverOpen}
      closePopover={() => setPopoverOpen(false)}
      ownFocus
      withTitle
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
                  'xpack.triggersActionsUI.sections.alertAdd.geoThreshold.closePopoverLabel',
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
