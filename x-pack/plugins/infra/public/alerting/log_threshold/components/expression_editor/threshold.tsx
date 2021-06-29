/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isNumber, isFinite } from 'lodash';
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
import {
  Comparator,
  ComparatorToi18nMap,
  AlertParams,
} from '../../../../../common/alerting/logs/log_threshold/types';

const thresholdPrefix = i18n.translate('xpack.infra.logs.alertFlyout.thresholdPrefix', {
  defaultMessage: 'is',
});

const popoverTitle = i18n.translate('xpack.infra.logs.alertFlyout.thresholdPopoverTitle', {
  defaultMessage: 'Threshold',
});

const getComparatorOptions = (): Array<{
  value: Comparator;
  text: string;
}> => {
  return [
    { value: Comparator.LT, text: ComparatorToi18nMap[Comparator.LT] },
    { value: Comparator.LT_OR_EQ, text: ComparatorToi18nMap[Comparator.LT_OR_EQ] },
    { value: Comparator.GT, text: ComparatorToi18nMap[Comparator.GT] },
    { value: Comparator.GT_OR_EQ, text: ComparatorToi18nMap[Comparator.GT_OR_EQ] },
  ];
};

interface Props {
  comparator?: Comparator;
  value?: number;
  updateThreshold: (params: Partial<AlertParams['count']>) => void;
  errors: IErrorObject;
}

export const Threshold: React.FC<Props> = ({ comparator, value, updateThreshold, errors }) => {
  const [isThresholdPopoverOpen, setThresholdPopoverOpenState] = useState(false);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="threshold"
          button={
            <EuiExpression
              description={thresholdPrefix}
              uppercase={true}
              value={`${comparator ? ComparatorToi18nMap[comparator] : ''} ${value ? value : ''}`}
              isActive={isThresholdPopoverOpen}
              onClick={() => setThresholdPopoverOpenState(true)}
            />
          }
          isOpen={isThresholdPopoverOpen}
          closePopover={() => setThresholdPopoverOpenState(false)}
          ownFocus
          panelPaddingSize="s"
          anchorPosition="downLeft"
        >
          <>
            <EuiPopoverTitle>{popoverTitle}</EuiPopoverTitle>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFormRow>
                  <EuiSelect
                    compressed
                    value={comparator}
                    onChange={(e) => updateThreshold({ comparator: e.target.value as Comparator })}
                    options={getComparatorOptions()}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow isInvalid={errors.value.length > 0} error={errors.value}>
                  <EuiFieldNumber
                    compressed
                    value={value}
                    onChange={(e) => {
                      const number = parseFloat(e.target.value);
                      updateThreshold({
                        value: isNumber(number) && isFinite(number) ? number : undefined,
                      });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
