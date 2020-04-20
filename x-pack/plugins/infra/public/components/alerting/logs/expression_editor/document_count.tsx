/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiPopoverTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiSelect,
  EuiFieldNumber,
  EuiExpression,
  EuiFormRow,
} from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
import { Comparator, LogDocumentCountAlertParams } from '../../../../../common/alerting/logs/types';

const getComparatorOptions = (): Array<{
  value: Comparator;
  text: Comparator;
}> => {
  return [
    { value: Comparator.LT, text: Comparator.LT },
    { value: Comparator.LT_OR_EQ, text: Comparator.LT_OR_EQ },
    { value: Comparator.GT, text: Comparator.GT },
    { value: Comparator.GT_OR_EQ, text: Comparator.GT_OR_EQ },
  ];
};

interface Props {
  comparator?: Comparator;
  value?: number;
  updateCount: (params: Partial<LogDocumentCountAlertParams['count']>) => void;
  errors: IErrorObject;
}

export const DocumentCount: React.FC<Props> = ({ comparator, value, updateCount, errors }) => {
  const [isComparatorPopoverOpen, setComparatorPopoverOpenState] = useState(false);
  const [isValuePopoverOpen, setIsValuePopoverOpen] = useState(false);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="comparator"
          button={
            <EuiExpression
              description="when"
              uppercase={true}
              value={comparator}
              isActive={isComparatorPopoverOpen}
              onClick={() => setComparatorPopoverOpenState(true)}
            />
          }
          isOpen={isComparatorPopoverOpen}
          closePopover={() => setComparatorPopoverOpenState(false)}
          ownFocus
          panelPaddingSize="s"
          anchorPosition="downLeft"
        >
          <div>
            <EuiPopoverTitle>WHEN</EuiPopoverTitle>
            <EuiSelect
              compressed
              value={comparator}
              onChange={e => updateCount({ comparator: e.target.value as Comparator })}
              options={getComparatorOptions()}
            />
          </div>
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPopover
          id="comparator"
          button={
            <EuiExpression
              description={value}
              uppercase={true}
              value={'log entries'}
              isActive={isValuePopoverOpen}
              onClick={() => setIsValuePopoverOpen(true)}
              color={errors.value.length === 0 ? 'secondary' : 'danger'}
            />
          }
          isOpen={isValuePopoverOpen}
          closePopover={() => setIsValuePopoverOpen(false)}
          ownFocus
          panelPaddingSize="s"
          anchorPosition="downLeft"
        >
          <div>
            <EuiPopoverTitle>LOG ENTRIES</EuiPopoverTitle>
            <EuiFormRow isInvalid={errors.value.length > 0} error={errors.value}>
              <EuiFieldNumber
                compressed
                value={value}
                onChange={e => {
                  const number = parseInt(e.target.value, 10);
                  updateCount({ value: number ? number : undefined });
                }}
              />
            </EuiFormRow>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
