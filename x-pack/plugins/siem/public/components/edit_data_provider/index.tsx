/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import styled, { injectGlobal } from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { OnDataProviderEdited } from '../timeline/events';
import { QueryOperator } from '../timeline/data_providers/data_provider';

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
const VALUE_INPUT_CLASS_NAME = 'edit-data-provider-value';
const SAVE_CLASS_NAME = 'edit-data-provider-save';

export const HeaderContainer = styled.div`
  width: ${EDIT_DATA_PROVIDER_WIDTH};
`;

// SIDE EFFECT: the following `injectGlobal` overrides the default styling
// of euiComboBoxOptionsList because it's implemented as a popover, so it's
// not selectable as a child of the styled component
// eslint-disable-next-line no-unused-expressions
injectGlobal`
  .euiComboBoxOptionsList {
    z-index: 9999;
  }
`;

export const FieldComboBox = styled(EuiComboBox)`
  width: ${FIELD_COMBO_BOX_WIDTH}px;
`;

export const OperatorComboBox = styled(EuiComboBox)`
  width: ${OPERATOR_COMBO_BOX_WIDTH}px;
`;

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
}

interface State {
  updatedField: EuiComboBoxOptionProps[];
  updatedOperator: EuiComboBoxOptionProps[];
  updatedValue: string | number;
}

const sanatizeValue = (value: string | number): string =>
  Array.isArray(value) ? `${value[0]}` : `${value}`; // fun fact: value should never be an array

export const getInitialOperatorLabel = (
  isExcluded: boolean,
  operator: QueryOperator
): EuiComboBoxOptionProps[] => {
  if (operator === ':') {
    return isExcluded ? [{ label: i18n.IS_NOT }] : [{ label: i18n.IS }];
  } else {
    return isExcluded ? [{ label: i18n.DOES_NOT_EXIST }] : [{ label: i18n.EXISTS }];
  }
};

export class StatefulEditDataProvider extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const { field, isExcluded, operator, value } = props;

    this.state = {
      updatedField: [{ label: field }],
      updatedOperator: getInitialOperatorLabel(isExcluded, operator),
      updatedValue: value,
    };
  }

  public componentDidMount() {
    this.disableScrolling();
    this.focusInput();
  }

  public componentWillUnmount() {
    this.enableScrolling();
  }

  public render() {
    const {
      andProviderId,
      browserFields,
      onDataProviderEdited,
      providerId,
      timelineId,
    } = this.props;
    const { updatedField, updatedOperator, updatedValue } = this.state;

    return (
      <EuiPanel paddingSize="s">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFormRow label={i18n.FIELD}>
                  <EuiToolTip
                    content={
                      this.state.updatedField.length > 0 ? this.state.updatedField[0].label : null
                    }
                  >
                    <FieldComboBox
                      isClearable={false}
                      onChange={this.onFieldSelected}
                      options={getCategorizedFieldNames(browserFields)}
                      placeholder={i18n.FIELD_PLACEHOLDER}
                      selectedOptions={this.state.updatedField}
                      singleSelection={{ asPlainText: true }}
                    />
                  </EuiToolTip>
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFormRow label={i18n.OPERATOR}>
                  <OperatorComboBox
                    isClearable={false}
                    onChange={this.onOperatorSelected}
                    options={operatorLabels}
                    placeholder={i18n.SELECT_AN_OPERATOR}
                    selectedOptions={this.state.updatedOperator}
                    singleSelection={{ asPlainText: true }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer />
          </EuiFlexItem>

          {this.state.updatedOperator.length > 0 &&
          this.state.updatedOperator[0].label !== i18n.EXISTS &&
          this.state.updatedOperator[0].label !== i18n.DOES_NOT_EXIST ? (
            <EuiFlexItem grow={false}>
              <EuiFormRow label={i18n.VALUE_LABEL}>
                <EuiFieldText
                  className={VALUE_INPUT_CLASS_NAME}
                  placeholder={i18n.VALUE}
                  onChange={this.onValueChange}
                  value={sanatizeValue(this.state.updatedValue)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={false}>
            <EuiSpacer />
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
                  onClick={() => {
                    onDataProviderEdited({
                      andProviderId,
                      excluded: getExcludedFromSelection(updatedOperator),
                      field: updatedField.length > 0 ? updatedField[0].label : '',
                      id: timelineId,
                      operator: getQueryOperatorFromSelection(updatedOperator),
                      providerId,
                      value: updatedValue,
                    });
                  }}
                  isDisabled={
                    !selectionsAreValid({
                      browserFields: this.props.browserFields,
                      selectedField: updatedField,
                      selectedOperator: updatedOperator,
                    })
                  }
                  size="s"
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  /** Focuses the Value input if it is visible, falling back to the Save button if it's not */
  private focusInput = () => {
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

  private onFieldSelected = (selectedField: EuiComboBoxOptionProps[]) => {
    this.setState({ updatedField: selectedField });

    this.focusInput();
  };

  private onOperatorSelected = (updatedOperator: EuiComboBoxOptionProps[]) => {
    this.setState({ updatedOperator });

    this.focusInput();
  };

  private onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      updatedValue: e.target.value,
    });
  };

  private disableScrolling = () => {
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

  private enableScrolling = () => (window.onscroll = () => noop);
}
