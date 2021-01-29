/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop, startsWith, endsWith } from 'lodash/fp';
import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../common/containers/source';
import { OnDataProviderEdited } from '../timeline/events';
import { DataProviderType, QueryOperator } from '../timeline/data_providers/data_provider';

import {
  getCategorizedFieldNames,
  getExcludedFromSelection,
  getQueryOperatorFromSelection,
  operatorLabels,
  selectionsAreValid,
} from './helpers';

import * as i18n from './translations';

const EDIT_DATA_PROVIDER_WIDTH = 400;
const FIELD_COMBO_BOX_WIDTH = 195;
const OPERATOR_COMBO_BOX_WIDTH = 160;
const SAVE_CLASS_NAME = 'edit-data-provider-save';
const VALUE_INPUT_CLASS_NAME = 'edit-data-provider-value';

export const HeaderContainer = styled.div`
  width: ${EDIT_DATA_PROVIDER_WIDTH};
`;

HeaderContainer.displayName = 'HeaderContainer';

interface Props {
  andProviderId?: string;
  browserFields: BrowserFields;
  field: string;
  isExcluded: boolean;
  onDataProviderEdited: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId: string;
  value: string | number;
  type?: DataProviderType;
}

const sanatizeValue = (value: string | number): string =>
  Array.isArray(value) ? `${value[0]}` : `${value}`; // fun fact: value should never be an array

export const getInitialOperatorLabel = (
  isExcluded: boolean,
  operator: QueryOperator
): EuiComboBoxOptionOption[] => {
  if (operator === ':') {
    return isExcluded ? [{ label: i18n.IS_NOT }] : [{ label: i18n.IS }];
  } else {
    return isExcluded ? [{ label: i18n.DOES_NOT_EXIST }] : [{ label: i18n.EXISTS }];
  }
};

export const StatefulEditDataProvider = React.memo<Props>(
  ({
    andProviderId,
    browserFields,
    field,
    isExcluded,
    onDataProviderEdited,
    operator,
    providerId,
    timelineId,
    value,
    type = DataProviderType.default,
  }) => {
    const [updatedField, setUpdatedField] = useState<EuiComboBoxOptionOption[]>([{ label: field }]);
    const [updatedOperator, setUpdatedOperator] = useState<EuiComboBoxOptionOption[]>(
      getInitialOperatorLabel(isExcluded, operator)
    );
    const [updatedValue, setUpdatedValue] = useState<string | number>(value);

    /** Focuses the Value input if it is visible, falling back to the Save button if it's not */
    const focusInput = () => {
      const elements = document.getElementsByClassName(VALUE_INPUT_CLASS_NAME);

      if (elements.length > 0) {
        (elements[0] as HTMLElement).focus(); // this cast is required because focus() does not exist on every `Element` returned by `getElementsByClassName`
      } else {
        const saveElements = document.getElementsByClassName(SAVE_CLASS_NAME);

        if (saveElements.length > 0) {
          (saveElements[0] as HTMLElement).focus();
        }
      }
    };

    const onFieldSelected = useCallback(
      (selectedField: EuiComboBoxOptionOption[]) => {
        setUpdatedField(selectedField);

        if (type === DataProviderType.template) {
          setUpdatedValue(`{${selectedField[0].label}}`);
        }

        focusInput();
      },
      [type]
    );

    const onOperatorSelected = useCallback((operatorSelected: EuiComboBoxOptionOption[]) => {
      setUpdatedOperator(operatorSelected);

      focusInput();
    }, []);

    const onValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setUpdatedValue(e.target.value);
    }, []);

    const disableScrolling = () => {
      const x =
        window.pageXOffset !== undefined
          ? window.pageXOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

      const y =
        window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollTop;

      window.onscroll = () => window.scrollTo(x, y);
    };

    const enableScrolling = () => {
      window.onscroll = () => noop;
    };

    const handleSave = useCallback(() => {
      onDataProviderEdited({
        andProviderId,
        excluded: getExcludedFromSelection(updatedOperator),
        field: updatedField.length > 0 ? updatedField[0].label : '',
        id: timelineId,
        operator: getQueryOperatorFromSelection(updatedOperator),
        providerId,
        value: updatedValue,
        type,
      });
    }, [
      onDataProviderEdited,
      andProviderId,
      updatedOperator,
      updatedField,
      timelineId,
      providerId,
      updatedValue,
      type,
    ]);

    const isValueFieldInvalid = useMemo(
      () =>
        type !== DataProviderType.template &&
        (startsWith('{', sanatizeValue(updatedValue)) ||
          endsWith('}', sanatizeValue(updatedValue))),
      [type, updatedValue]
    );

    useEffect(() => {
      disableScrolling();
      focusInput();
      return () => {
        enableScrolling();
      };
    }, []);

    return (
      <EuiPanel paddingSize="s">
        <EuiFocusTrap data-test-subj="focusTrap">
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" direction="row" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFormRow label={i18n.FIELD}>
                    <EuiComboBox
                      data-test-subj="field"
                      isClearable={false}
                      onChange={onFieldSelected}
                      options={getCategorizedFieldNames(browserFields)}
                      placeholder={i18n.FIELD_PLACEHOLDER}
                      selectedOptions={updatedField}
                      singleSelection={{ asPlainText: true }}
                      style={{ width: `${FIELD_COMBO_BOX_WIDTH}px` }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow label={i18n.OPERATOR}>
                    <EuiComboBox
                      data-test-subj="operator"
                      isClearable={false}
                      onChange={onOperatorSelected}
                      options={operatorLabels}
                      placeholder={i18n.SELECT_AN_OPERATOR}
                      selectedOptions={updatedOperator}
                      singleSelection={{ asPlainText: true }}
                      style={{ width: `${OPERATOR_COMBO_BOX_WIDTH}px` }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
            </EuiFlexItem>

            {type !== DataProviderType.template &&
            updatedOperator.length > 0 &&
            updatedOperator[0].label !== i18n.EXISTS &&
            updatedOperator[0].label !== i18n.DOES_NOT_EXIST ? (
              <EuiFlexItem grow={false}>
                <EuiFormRow label={i18n.VALUE_LABEL}>
                  <EuiFieldText
                    className={VALUE_INPUT_CLASS_NAME}
                    data-test-subj="value"
                    onChange={onValueChange}
                    placeholder={i18n.VALUE}
                    value={sanatizeValue(updatedValue)}
                    isInvalid={isValueFieldInvalid}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}

            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    autoFocus
                    className={SAVE_CLASS_NAME}
                    color="primary"
                    data-test-subj="save"
                    fill={true}
                    isDisabled={
                      !selectionsAreValid({
                        browserFields,
                        selectedField: updatedField,
                        selectedOperator: updatedOperator,
                      }) || isValueFieldInvalid
                    }
                    onClick={handleSave}
                    size="m"
                  >
                    {i18n.SAVE}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFocusTrap>
      </EuiPanel>
    );
  }
);

StatefulEditDataProvider.displayName = 'StatefulEditDataProvider';
