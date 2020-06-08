/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

export interface Entity {
  fieldName: string;
  fieldValue: any;
  fieldValues: any;
}

interface EntityControlProps {
  entity: Entity;
  entityFieldValueChanged: (entity: Entity, fieldValue: any) => void;
  isLoading: boolean;
  onSearchChange: (entity: Entity, queryTerm: string) => void;
  forceSelection: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
}

interface EntityControlState {
  selectedOptions: Array<EuiComboBoxOptionOption<string>> | undefined;
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>> | undefined;
}

export const EMPTY_FIELD_VALUE_LABEL = i18n.translate(
  'xpack.ml.timeSeriesExplorer.emptyPartitionFieldLabel.',
  {
    defaultMessage: '"" (empty string)',
  }
);

export class EntityControl extends Component<EntityControlProps, EntityControlState> {
  inputRef: any;

  state = {
    selectedOptions: undefined,
    options: undefined,
    isLoading: false,
  };

  componentDidUpdate(prevProps: EntityControlProps) {
    const { entity, forceSelection, isLoading, options: propOptions } = this.props;
    const { options: stateOptions, selectedOptions } = this.state;

    const { fieldValue } = entity;

    let selectedOptionsUpdate: Array<EuiComboBoxOptionOption<string>> | undefined = selectedOptions;
    if (
      (selectedOptions === undefined && fieldValue !== null) ||
      (Array.isArray(selectedOptions) &&
        // @ts-ignore
        selectedOptions[0].value !== fieldValue &&
        fieldValue !== null)
    ) {
      selectedOptionsUpdate = [
        { label: fieldValue === '' ? EMPTY_FIELD_VALUE_LABEL : fieldValue, value: fieldValue },
      ];
    } else if (Array.isArray(selectedOptions) && fieldValue === null) {
      selectedOptionsUpdate = undefined;
    }

    if (prevProps.isLoading === true && isLoading === false) {
      this.setState({
        isLoading: false,
        selectedOptions: selectedOptionsUpdate,
      });
    }

    if (!isEqual(propOptions, stateOptions)) {
      this.setState({
        options: propOptions,
      });
    }

    if (forceSelection && this.inputRef) {
      this.inputRef.focus();
    }
  }

  onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const options = selectedOptions.length > 0 ? selectedOptions : undefined;
    this.setState({
      selectedOptions: options,
    });

    const fieldValue =
      Array.isArray(options) && options[0].value !== null ? options[0].value : null;
    this.props.entityFieldValueChanged(this.props.entity, fieldValue);
  };

  onSearchChange = (searchValue: string) => {
    this.setState({
      isLoading: true,
      options: [],
    });
    this.props.onSearchChange(this.props.entity, searchValue);
  };

  renderOption = (option: EuiSelectableOption) => {
    const { label } = option;
    return label === EMPTY_FIELD_VALUE_LABEL ? <i>{label}</i> : label;
  };

  render() {
    const { entity, forceSelection } = this.props;
    const { isLoading, options, selectedOptions } = this.state;

    const control = (
      <EuiComboBox
        async
        isLoading={isLoading}
        inputRef={(input) => {
          if (input) {
            this.inputRef = input;
          }
        }}
        style={{ minWidth: '300px' }}
        placeholder={i18n.translate('xpack.ml.timeSeriesExplorer.enterValuePlaceholder', {
          defaultMessage: 'Enter value',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={this.onChange}
        onSearchChange={this.onSearchChange}
        isClearable={false}
        renderOption={this.renderOption}
      />
    );

    const selectMessage = (
      <FormattedMessage
        id="xpack.ml.timeSeriesExplorer.selectFieldMessage"
        defaultMessage="Select {fieldName}"
        values={{ fieldName: entity.fieldName }}
      />
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiFormRow label={entity.fieldName} helpText={forceSelection ? selectMessage : null}>
          <EuiToolTip position="right" content={forceSelection ? selectMessage : null}>
            {control}
          </EuiToolTip>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }
}
