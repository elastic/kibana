/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiSelect,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldNumber,
} from '@elastic/eui';
import { getTimeUnitLabel } from '../lib/get_time_unit_label';
import { TIME_UNITS } from '../../application/constants';
import { getTimeOptions } from '../lib/get_time_options';
import { ClosablePopoverTitle } from './components';
import { IErrorObject } from '../../types';

export interface ForLastExpressionProps {
  timeWindowSize?: number;
  timeWindowUnit?: string;
  errors: IErrorObject;
  onChangeWindowSize: (selectedWindowSize: number | undefined) => void;
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
  display?: 'fullWidth' | 'inline';
}

export const ForLastExpression = ({
  timeWindowSize,
  timeWindowUnit = 's',
  display = 'inline',
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
          data-test-subj="forLastExpression"
          value={`${timeWindowSize} ${getTimeUnitLabel(
            timeWindowUnit as TIME_UNITS,
            (timeWindowSize ?? '').toString()
          )}`}
          isActive={alertDurationPopoverOpen}
          onClick={() => {
            setAlertDurationPopoverOpen(!alertDurationPopoverOpen);
          }}
          display={display === 'inline' ? 'inline' : 'columns'}
          isInvalid={!timeWindowSize}
        />
      }
      isOpen={alertDurationPopoverOpen}
      closePopover={() => {
        setAlertDurationPopoverOpen(false);
      }}
      ownFocus
      display={display === 'fullWidth' ? 'block' : 'inlineBlock'}
      anchorPosition={popupPosition ?? 'downLeft'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAlertDurationPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.forTheLast.popoverTitle"
            defaultMessage="For the last"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              isInvalid={errors.timeWindowSize.length > 0 && timeWindowSize !== undefined}
              error={errors.timeWindowSize}
            >
              <EuiFieldNumber
                data-test-subj="timeWindowSizeNumber"
                isInvalid={errors.timeWindowSize.length > 0 && timeWindowSize !== undefined}
                min={0}
                value={timeWindowSize || ''}
                onChange={(e) => {
                  const { value } = e.target;
                  const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                  onChangeWindowSize(timeWindowSizeVal);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                onChangeWindowUnit(e.target.value);
              }}
              options={getTimeOptions(timeWindowSize ?? 1)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { ForLastExpression as default };
