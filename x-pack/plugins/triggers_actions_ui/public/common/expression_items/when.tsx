/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover, EuiPopoverTitle, EuiSelect } from '@elastic/eui';
import { builtInAggregationTypes } from '../constants';
import { AggregationType } from '../types';

interface WhenExpressionProps {
  aggType: string;
  customAggTypesOptions?: { [key: string]: AggregationType };
  onChangeSelectedAggType: (selectedAggType: string) => void;
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

export const WhenExpression = ({
  aggType,
  customAggTypesOptions,
  onChangeSelectedAggType,
  popupPosition,
}: WhenExpressionProps) => {
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const aggregationTypes = customAggTypesOptions ?? builtInAggregationTypes;
  return (
    <EuiPopover
      button={
        <EuiExpression
          data-test-subj="whenExpression"
          description={i18n.translate(
            'xpack.triggersActionsUI.common.expressionItems.threshold.descriptionLabel',
            {
              defaultMessage: 'when',
            }
          )}
          value={aggregationTypes[aggType].text}
          isActive={aggTypePopoverOpen}
          onClick={() => {
            setAggTypePopoverOpen(true);
          }}
        />
      }
      isOpen={aggTypePopoverOpen}
      closePopover={() => {
        setAggTypePopoverOpen(false);
      }}
      ownFocus
      withTitle
      anchorPosition={popupPosition ?? 'downLeft'}
    >
      <div>
        <EuiPopoverTitle>
          {i18n.translate('xpack.triggersActionsUI.common.expressionItems.threshold.popoverTitle', {
            defaultMessage: 'when',
          })}
        </EuiPopoverTitle>
        <EuiSelect
          data-test-subj="whenExpressionSelect"
          value={aggType}
          fullWidth
          onChange={e => {
            onChangeSelectedAggType(e.target.value);
            setAggTypePopoverOpen(false);
          }}
          options={Object.values(aggregationTypes).map(({ text, value }) => {
            return {
              text,
              value,
            };
          })}
        />
      </div>
    </EuiPopover>
  );
};
