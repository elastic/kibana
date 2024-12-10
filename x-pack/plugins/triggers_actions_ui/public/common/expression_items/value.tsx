/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useState } from 'react';
import {
  EuiExpression,
  EuiPopover,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { ClosablePopoverTitle } from './components';
import { IErrorObject } from '../../types';

export interface ValueExpressionProps {
  description: string;
  value: number;
  valueLabel?: string | ReactNode;
  onChangeSelectedValue: (updatedValue: number) => void;
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
  errors: string | string[] | IErrorObject;
}

export const ValueExpression = ({
  description,
  value,
  valueLabel,
  onChangeSelectedValue,
  display = 'inline',
  popupPosition,
  errors,
}: ValueExpressionProps) => {
  const [valuePopoverOpen, setValuePopoverOpen] = useState(false);
  return (
    <EuiPopover
      button={
        <EuiExpression
          data-test-subj="valueExpression"
          description={description}
          value={valueLabel ?? value}
          isActive={valuePopoverOpen}
          display={display === 'inline' ? 'inline' : 'columns'}
          onClick={() => {
            setValuePopoverOpen(true);
          }}
          isInvalid={Number(errors.length) > 0}
        />
      }
      isOpen={valuePopoverOpen}
      closePopover={() => {
        setValuePopoverOpen(false);
      }}
      ownFocus
      display={display === 'fullWidth' ? 'block' : 'inline-block'}
      anchorPosition={popupPosition ?? 'downLeft'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle
          data-test-subj="valueFieldTitle"
          onClose={() => setValuePopoverOpen(false)}
        >
          <>{description}</>
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              data-test-subj="valueFieldNumberForm"
              isInvalid={Number(errors.length) > 0 && value !== undefined}
              error={errors as string[]}
            >
              <EuiFieldNumber
                data-test-subj="valueFieldNumber"
                min={0}
                value={value}
                isInvalid={Number(errors.length) > 0 && value !== undefined}
                onChange={(e: any) => {
                  onChangeSelectedValue(e.target.value as number);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { ValueExpression as default };
