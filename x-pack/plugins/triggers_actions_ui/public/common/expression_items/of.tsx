/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';
import { builtInAggregationTypes } from '../constants';
import { AggregationType } from '../types';

interface OfExpressionProps {
  aggType: string;
  aggField?: string;
  errors: { [key: string]: string[] };
  onChangeSelectedAggField: (selectedAggType?: string) => void;
  fields: Record<string, any>;
  customAggTypesOptions?: {
    [key: string]: AggregationType;
  };
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

export const OfExpression = ({
  aggType,
  aggField,
  errors,
  onChangeSelectedAggField,
  fields,
  customAggTypesOptions,
  popupPosition,
}: OfExpressionProps) => {
  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const firstFieldOption = {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.expressionItems.of.selectTimeFieldOptionLabel',
      {
        defaultMessage: 'Select a field',
      }
    ),
    value: '',
  };
  const aggregationTypes = customAggTypesOptions ?? builtInAggregationTypes;

  const availablefieldsOptions = fields.reduce((esFieldOptions: any[], field: any) => {
    if (aggregationTypes[aggType].validNormalizedTypes.includes(field.normalizedType)) {
      esFieldOptions.push({
        label: field.name,
      });
    }
    return esFieldOptions;
  }, []);

  return (
    <EuiPopover
      id="aggFieldPopover"
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.triggersActionsUI.common.expressionItems.of.buttonLabel',
            {
              defaultMessage: 'of',
            }
          )}
          value={aggField || firstFieldOption.text}
          isActive={aggFieldPopoverOpen || !aggField}
          onClick={() => {
            setAggFieldPopoverOpen(true);
          }}
          color={aggField ? 'secondary' : 'danger'}
        />
      }
      isOpen={aggFieldPopoverOpen}
      closePopover={() => {
        setAggFieldPopoverOpen(false);
      }}
      withTitle
      anchorPosition={popupPosition ?? 'downRight'}
      zIndex={8000}
    >
      <div>
        <EuiPopoverTitle>
          {i18n.translate('xpack.triggersActionsUI.common.expressionItems.of.popoverTitle', {
            defaultMessage: 'of',
          })}
        </EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false} className="watcherThresholdAlertAggFieldContainer">
            <EuiFormRow
              fullWidth
              isInvalid={errors.aggField.length > 0 && aggField !== undefined}
              error={errors.aggField}
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                data-test-subj="availablefieldsOptionsComboBox"
                isInvalid={errors.aggField.length > 0 && aggField !== undefined}
                placeholder={firstFieldOption.text}
                options={availablefieldsOptions}
                noSuggestions={!availablefieldsOptions.length}
                selectedOptions={aggField ? [{ label: aggField }] : []}
                onChange={selectedOptions => {
                  onChangeSelectedAggField(
                    selectedOptions.length === 1 ? selectedOptions[0].label : undefined
                  );
                  setAggFieldPopoverOpen(false);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
