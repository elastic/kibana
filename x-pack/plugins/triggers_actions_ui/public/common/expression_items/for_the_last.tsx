/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldNumber,
} from '@elastic/eui';
import { getTimeUnitLabel } from '../lib/get_time_unit_label';
import { TIME_UNITS } from '../../application/constants';
import { getTimeOptions } from '../lib/get_time_options';

interface ForLastExpressionProps {
  timeWindowSize?: number;
  timeWindowUnit?: string;
  errors: { [key: string]: string[] };
  onChangeWindowSize: (selectedWindowSize: number | '') => void;
  onChangeWindowUnit: (selectedWindowUnit: string) => void;
  popupPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

export const ForLastExpression = ({
  timeWindowSize = 1,
  timeWindowUnit = 's',
  errors,
  onChangeWindowSize,
  onChangeWindowUnit,
  popupPosition,
}: ForLastExpressionProps) => {
  const [alertDurationPopoverOpen, setAlertDurationPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.triggersActionsUI.common.expressionItems.forTheLast.descriptionLabel',
            {
              defaultMessage: 'for the last',
            }
          )}
          value={`${timeWindowSize} ${getTimeUnitLabel(
            timeWindowUnit as TIME_UNITS,
            timeWindowSize.toString()
          )}`}
          isActive={alertDurationPopoverOpen}
          onClick={() => {
            setAlertDurationPopoverOpen(true);
          }}
          color={timeWindowSize ? 'secondary' : 'danger'}
        />
      }
      isOpen={alertDurationPopoverOpen}
      closePopover={() => {
        setAlertDurationPopoverOpen(false);
      }}
      ownFocus
      withTitle
      anchorPosition={popupPosition ?? 'downLeft'}
    >
      <div>
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.forTheLast.popoverTitle"
            defaultMessage="For the last"
          />
        </EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              isInvalid={errors.timeWindowSize.length > 0 && timeWindowSize !== undefined}
              error={errors.timeWindowSize}
            >
              <EuiFieldNumber
                data-test-subj="timeWindowSizeNumber"
                isInvalid={errors.timeWindowSize.length > 0 && timeWindowSize !== undefined}
                min={1}
                value={timeWindowSize}
                onChange={e => {
                  const { value } = e.target;
                  const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : value;
                  onChangeWindowSize(timeWindowSizeVal);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={e => {
                onChangeWindowUnit(e.target.value);
              }}
              options={getTimeOptions(timeWindowSize)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
