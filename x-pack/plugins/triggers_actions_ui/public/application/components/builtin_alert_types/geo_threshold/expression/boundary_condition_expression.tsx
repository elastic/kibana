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

export const BoundaryConditionExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({ errors }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const indexPopover = (
    <EuiFormRow
      id="someSelect"
      fullWidth
      isInvalid={false /* TODO: Determine error conditions */}
      error={errors.index}
    >
      <div>Some select</div>
    </EuiFormRow>
  );

  return (
    <EuiPopover
      id="somePopover"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectIndexExpression"
          description={i18n.translate(
            'xpack.triggersActionsUI.sections.alertAdd.threshold.indexLabel',
            {
              defaultMessage: 'when entity',
            }
          )}
          value={'someValue'}
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
            <EuiFlexItem>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.alertAdd.threshold.indexButtonLabel',
                {
                  defaultMessage: 'when entity',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closePopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.threshold.closeIndexPopoverLabel',
                  {
                    defaultMessage: 'Close',
                  }
                )}
                onClick={() => setPopoverOpen(false)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        {indexPopover}
      </div>
    </EuiPopover>
  );
};
