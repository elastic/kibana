/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
} from '@elastic/eui';
import { builtInGroupByTypes } from '../constants';
import { GroupByType } from '../types';
import { ClosablePopoverTitle } from './components';
import { IErrorObject } from '../../types';

interface GroupByExpressionProps {
  groupBy: string;
  errors: IErrorObject;
  onChangeSelectedTermSize: (selectedTermSize?: number) => void;
  onChangeSelectedTermField: (selectedTermField?: string) => void;
  onChangeSelectedGroupBy: (selectedGroupBy?: string) => void;
  fields: Record<string, any>;
  termSize?: number;
  termField?: string;
  customGroupByTypes?: {
    [key: string]: GroupByType;
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
}

export const GroupByExpression = ({
  groupBy,
  errors,
  onChangeSelectedTermSize,
  onChangeSelectedTermField,
  onChangeSelectedGroupBy,
  display = 'inline',
  fields,
  termSize,
  termField,
  customGroupByTypes,
  popupPosition,
}: GroupByExpressionProps) => {
  const groupByTypes = customGroupByTypes ?? builtInGroupByTypes;
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const MIN_TERM_SIZE = 1;
  const MAX_TERM_SIZE = 1000;
  const firstFieldOption = {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.expressionItems.groupByType.timeFieldOptionLabel',
      {
        defaultMessage: 'Select a field',
      }
    ),
    value: '',
  };

  return (
    <EuiPopover
      button={
        <EuiExpression
          description={`${
            groupByTypes[groupBy].sizeRequired
              ? i18n.translate(
                  'xpack.triggersActionsUI.common.expressionItems.groupByType.groupedOverLabel',
                  {
                    defaultMessage: 'grouped over',
                  }
                )
              : i18n.translate(
                  'xpack.triggersActionsUI.common.expressionItems.groupByType.overLabel',
                  {
                    defaultMessage: 'over',
                  }
                )
          }`}
          value={`${groupByTypes[groupBy].text} ${
            groupByTypes[groupBy].sizeRequired
              ? `${termSize} ${termField ? `'${termField}'` : ''}`
              : ''
          }`}
          isActive={groupByPopoverOpen || (groupBy === 'top' && !(termSize && termField))}
          onClick={() => {
            setGroupByPopoverOpen(true);
          }}
          display={display === 'inline' ? 'inline' : 'columns'}
          isInvalid={!(groupBy === 'all' || (termSize && termField))}
        />
      }
      isOpen={groupByPopoverOpen}
      closePopover={() => {
        setGroupByPopoverOpen(false);
      }}
      ownFocus
      withTitle
      display={display === 'fullWidth' ? 'block' : 'inlineBlock'}
      anchorPosition={popupPosition ?? 'downRight'}
    >
      <div>
        <ClosablePopoverTitle onClose={() => setGroupByPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.groupByType.overButtonLabel"
            defaultMessage="over"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="overExpressionSelect"
              value={groupBy}
              onChange={(e) => {
                if (groupByTypes[e.target.value].sizeRequired) {
                  onChangeSelectedTermSize(MIN_TERM_SIZE);
                  onChangeSelectedTermField('');
                } else {
                  onChangeSelectedTermSize(undefined);
                  onChangeSelectedTermField(undefined);
                }
                onChangeSelectedGroupBy(e.target.value);
              }}
              options={Object.values(groupByTypes).map(({ text, value }) => {
                return {
                  text,
                  value,
                };
              })}
            />
          </EuiFlexItem>

          {groupByTypes[groupBy].sizeRequired ? (
            <Fragment>
              <EuiFlexItem grow={false}>
                <EuiFormRow isInvalid={errors.termSize.length > 0} error={errors.termSize}>
                  <EuiFieldNumber
                    isInvalid={errors.termSize.length > 0}
                    value={termSize || ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      const termSizeVal = value !== '' ? parseFloat(value) : undefined;
                      onChangeSelectedTermSize(termSizeVal);
                    }}
                    min={MIN_TERM_SIZE}
                    max={MAX_TERM_SIZE}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  isInvalid={errors.termField.length > 0 && termField !== undefined}
                  error={errors.termField}
                >
                  <EuiSelect
                    data-test-subj="fieldsExpressionSelect"
                    value={termField}
                    isInvalid={errors.termField.length > 0 && termField !== undefined}
                    onChange={(e) => {
                      onChangeSelectedTermField(e.target.value);
                    }}
                    options={fields.reduce(
                      (options: any, field: { name: string; normalizedType: string }) => {
                        if (
                          groupByTypes[groupBy].validNormalizedTypes.includes(field.normalizedType)
                        ) {
                          options.push({
                            text: field.name,
                            value: field.name,
                          });
                        }
                        return options;
                      },
                      [firstFieldOption]
                    )}
                    onBlur={() => {
                      if (termField === undefined) {
                        onChangeSelectedTermField('');
                      }
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </Fragment>
          ) : null}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
