/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiText,
} from '@elastic/eui';
import { builtInComparators } from '../constants';
import { Comparator } from '../types';
import { IErrorObject } from '../../types';
import { ClosablePopoverTitle } from './components';

interface ThresholdExpressionProps {
  thresholdComparator: string;
  errors: IErrorObject;
  onChangeSelectedThresholdComparator: (selectedThresholdComparator?: string) => void;
  onChangeSelectedThreshold: (selectedThreshold?: number[]) => void;
  customComparators?: {
    [key: string]: Comparator;
  };
  threshold?: number[];
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

export const ThresholdExpression = ({
  thresholdComparator,
  errors,
  onChangeSelectedThresholdComparator,
  onChangeSelectedThreshold,
  customComparators,
  display = 'inline',
  threshold = [],
  popupPosition,
}: ThresholdExpressionProps) => {
  const comparators = customComparators ?? builtInComparators;
  const [alertThresholdPopoverOpen, setAlertThresholdPopoverOpen] = useState(false);

  const andThresholdText = i18n.translate(
    'xpack.triggersActionsUI.common.expressionItems.threshold.andLabel',
    {
      defaultMessage: 'AND',
    }
  );

  return (
    <EuiPopover
      button={
        <EuiExpression
          data-test-subj="thresholdPopover"
          description={comparators[thresholdComparator].text}
          value={(threshold || [])
            .slice(0, comparators[thresholdComparator].requiredValues)
            .join(` ${andThresholdText} `)}
          isActive={Boolean(
            alertThresholdPopoverOpen ||
              (errors.threshold0 && errors.threshold0.length) ||
              (errors.threshold1 && errors.threshold1.length)
          )}
          onClick={() => {
            setAlertThresholdPopoverOpen(true);
          }}
          display={display === 'inline' ? 'inline' : 'columns'}
          isInvalid={
            (errors.threshold0 && errors.threshold0.length) ||
            (errors.threshold1 && errors.threshold1.length) > 0
              ? true
              : false
          }
        />
      }
      isOpen={alertThresholdPopoverOpen}
      closePopover={() => {
        setAlertThresholdPopoverOpen(false);
      }}
      ownFocus
      withTitle
      display={display === 'fullWidth' ? 'block' : 'inlineBlock'}
      anchorPosition={popupPosition ?? 'downLeft'}
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAlertThresholdPopoverOpen(false)}>
          <>{comparators[thresholdComparator].text}</>
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="comparatorOptionsComboBox"
              value={thresholdComparator}
              onChange={(e) => {
                onChangeSelectedThresholdComparator(e.target.value);
                const thresholdValues = threshold.slice(
                  0,
                  comparators[e.target.value].requiredValues
                );
                onChangeSelectedThreshold(thresholdValues);
              }}
              options={Object.values(comparators).map(({ text, value }) => {
                return { text, value };
              })}
            />
          </EuiFlexItem>
          {Array.from(Array(comparators[thresholdComparator].requiredValues)).map((_notUsed, i) => {
            return (
              <Fragment key={`threshold${i}`}>
                {i > 0 ? (
                  <EuiFlexItem
                    grow={false}
                    className="watcherThresholdWatchInBetweenComparatorText"
                  >
                    <EuiText>{andThresholdText}</EuiText>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    isInvalid={errors[`threshold${i}`]?.length > 0 || !threshold[i]}
                    error={errors[`threshold${i}`]}
                  >
                    <EuiFieldNumber
                      data-test-subj="alertThresholdInput"
                      min={0}
                      value={!threshold || threshold[i] === undefined ? '' : threshold[i]}
                      isInvalid={errors[`threshold${i}`]?.length > 0 || !threshold[i]}
                      onChange={(e) => {
                        const { value } = e.target;
                        const thresholdVal = value !== '' ? parseFloat(value) : undefined;
                        const newThreshold = [...threshold];
                        if (thresholdVal !== undefined) {
                          newThreshold[i] = thresholdVal;
                        } else {
                          delete newThreshold[i];
                        }
                        onChangeSelectedThreshold(newThreshold);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </Fragment>
            );
          })}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
