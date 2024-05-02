/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiComboBoxOptionOption,
  EuiComboBox,
} from '@elastic/eui';
import { builtInGroupByTypes } from '../constants';
import { FieldOption, GroupByType } from '../types';
import { ClosablePopoverTitle } from './components';
import { IErrorObject } from '../../types';

interface GroupByOverFieldOption {
  label: string;
}
export interface GroupByExpressionProps {
  groupBy: string;
  errors: IErrorObject;
  onChangeSelectedTermSize: (selectedTermSize?: number) => void;
  onChangeSelectedTermField: (selectedTermField?: string | string[]) => void;
  onChangeSelectedGroupBy: (selectedGroupBy?: string) => void;
  fields?: FieldOption[];
  termSize?: number;
  termField?: string | string[];
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
  canSelectMultiTerms?: boolean;
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
  canSelectMultiTerms,
}: GroupByExpressionProps) => {
  const groupByTypes = customGroupByTypes ?? builtInGroupByTypes;
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const MIN_TERM_SIZE = 1;
  const MAX_TERM_SIZE = 1000;

  const availableFieldOptions: GroupByOverFieldOption[] = useMemo(
    () =>
      (fields ?? []).reduce((options: GroupByOverFieldOption[], field: FieldOption) => {
        if (groupByTypes[groupBy].validNormalizedTypes.includes(field.normalizedType)) {
          options.push({ label: field.name });
        }
        return options;
      }, []),
    [groupByTypes, fields, groupBy]
  );

  const initialTermFieldOptions = useMemo(() => {
    let initialFields: string[] = [];

    if (!!termField) {
      initialFields = Array.isArray(termField) ? termField : [termField];
    }
    return initialFields.map((field: string) => ({
      label: field,
    }));
  }, [termField]);

  const [selectedTermsFieldsOptions, setSelectedTermsFieldsOptions] =
    useState<GroupByOverFieldOption[]>(initialTermFieldOptions);

  useEffect(() => {
    if (groupBy === builtInGroupByTypes.all.value && selectedTermsFieldsOptions.length > 0) {
      setSelectedTermsFieldsOptions([]);
      onChangeSelectedTermField(undefined);
    }
  }, [selectedTermsFieldsOptions, groupBy, onChangeSelectedTermField]);

  useEffect(() => {
    if (fields) {
      // if current field set doesn't contain selected field, clear selection
      const hasUnknownField = selectedTermsFieldsOptions.some(
        (fieldOption) => !fields.some((field) => field.name === fieldOption.label)
      );
      if (hasUnknownField) {
        setSelectedTermsFieldsOptions([]);
        onChangeSelectedTermField(undefined);
      }
    }
  }, [selectedTermsFieldsOptions, fields, onChangeSelectedTermField]);

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
          data-test-subj="groupByExpression"
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
          isInvalid={!(groupBy === 'all' || (termSize && termField && termField.length > 0))}
        />
      }
      isOpen={groupByPopoverOpen}
      closePopover={() => {
        setGroupByPopoverOpen(false);
      }}
      ownFocus
      display={display === 'fullWidth' ? 'block' : 'inline-block'}
      anchorPosition={popupPosition ?? 'downRight'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle onClose={() => setGroupByPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.groupByType.overButtonLabel"
            defaultMessage="over"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={1}>
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
            <>
              <EuiFlexItem grow={1}>
                <EuiFormRow isInvalid={errors.termSize.length > 0} error={errors.termSize}>
                  <EuiFieldNumber
                    data-test-subj="fieldsNumberSelect"
                    css={css`
                      min-width: 50px;
                    `}
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
              <EuiFlexItem grow={2}>
                <EuiFormRow isInvalid={errors.termField.length > 0} error={errors.termField}>
                  <EuiComboBox
                    singleSelection={canSelectMultiTerms ? false : { asPlainText: true }}
                    placeholder={i18n.translate(
                      'xpack.triggersActionsUI.common.expressionItems.groupByType.timeFieldOptionLabel',
                      {
                        defaultMessage: 'Select a field',
                      }
                    )}
                    data-test-subj="fieldsExpressionSelect"
                    isInvalid={errors.termField.length > 0}
                    selectedOptions={selectedTermsFieldsOptions}
                    onChange={(
                      selectedOptions: Array<EuiComboBoxOptionOption<GroupByOverFieldOption>>
                    ) => {
                      const selectedTermFields = selectedOptions.map((option) => option.label);

                      const termsToSave =
                        Array.isArray(selectedTermFields) && selectedTermFields.length > 1
                          ? selectedTermFields
                          : selectedTermFields[0];

                      onChangeSelectedTermField(termsToSave);
                      setSelectedTermsFieldsOptions(selectedOptions);
                    }}
                    options={availableFieldOptions}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </>
          ) : null}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { GroupByExpression as default };
