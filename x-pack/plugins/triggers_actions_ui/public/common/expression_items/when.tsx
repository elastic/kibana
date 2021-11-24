/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiExpression, EuiPopover, EuiSelect } from '@elastic/eui';
import { builtInAggregationTypes } from '../constants';
import { AggregationType } from '../types';
import { ClosablePopoverTitle } from './components';

export interface WhenExpressionProps {
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
  display?: 'fullWidth' | 'inline';
}

export const WhenExpression = ({
  aggType,
  customAggTypesOptions,
  onChangeSelectedAggType,
  display = 'inline',
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
          display={display === 'inline' ? 'inline' : 'columns'}
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
      display={display === 'fullWidth' ? 'block' : 'inlineBlock'}
      anchorPosition={popupPosition ?? 'downLeft'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAggTypePopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.threshold.popoverTitle"
            defaultMessage="when"
          />
        </ClosablePopoverTitle>
        <EuiSelect
          data-test-subj="whenExpressionSelect"
          id="aggTypeField"
          value={aggType}
          fullWidth
          onChange={(e) => {
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

// eslint-disable-next-line import/no-default-export
export { WhenExpression as default };
