/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';
import { builtInAggregationTypes } from '../constants';
import { AggregationType } from '../types';
import { IErrorObject } from '../../types';
import { ClosablePopoverTitle } from './components';
import './of.scss';

export interface OfExpressionProps {
  aggType: string;
  aggField?: string;
  errors: IErrorObject;
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
  display?: 'fullWidth' | 'inline';
  helpText?: string | JSX.Element;
}

export const OfExpression = ({
  aggType,
  aggField,
  errors,
  onChangeSelectedAggField,
  fields,
  display = 'inline',
  customAggTypesOptions,
  popupPosition,
  helpText,
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
          data-test-subj="ofExpressionPopover"
          display={display === 'inline' ? 'inline' : 'columns'}
          value={aggField || firstFieldOption.text}
          isActive={aggFieldPopoverOpen || !aggField}
          onClick={() => {
            setAggFieldPopoverOpen(true);
          }}
          isInvalid={!aggField}
        />
      }
      isOpen={aggFieldPopoverOpen}
      closePopover={() => {
        setAggFieldPopoverOpen(false);
      }}
      display={display === 'fullWidth' ? 'block' : 'inlineBlock'}
      anchorPosition={popupPosition ?? 'downRight'}
      zIndex={8000}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAggFieldPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.of.popoverTitle"
            defaultMessage="of"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false} className="actOf__aggFieldContainer">
            <EuiFormRow
              id="ofField"
              fullWidth
              isInvalid={errors.aggField.length > 0 && aggField !== undefined}
              error={errors.aggField}
              data-test-subj="availablefieldsOptionsFormRow"
              helpText={helpText}
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
                onChange={(selectedOptions) => {
                  onChangeSelectedAggField(
                    selectedOptions.length === 1 ? selectedOptions[0].label : undefined
                  );
                  if (selectedOptions.length > 0) {
                    setAggFieldPopoverOpen(false);
                  }
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
export { OfExpression as default };
