/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiHighlight,
} from '@elastic/eui';
import { EntityFieldType } from '../../../../../common/types/anomalies';
import { UiPartitionFieldConfig } from '../series_controls/series_controls';
import { getSeverityColor } from '../../../../../common';
import { EntityConfig } from './entity_config';

export interface Entity {
  fieldName: string;
  fieldType: EntityFieldType;
  fieldValue: any;
  fieldValues?: any;
}

/**
 * Configuration for entity field dropdown options
 */
export interface FieldConfig {
  isAnomalousOnly: boolean;
}

export type ComboBoxOption = EuiComboBoxOptionOption<{
  value: string | number;
  maxRecordScore?: number;
}>;

export interface EntityControlProps {
  entity: Entity;
  entityFieldValueChanged: (entity: Entity, fieldValue: string | number | null) => void;
  isLoading: boolean;
  onSearchChange: (entity: Entity, queryTerm: string) => void;
  config: UiPartitionFieldConfig;
  onConfigChange: (fieldType: EntityFieldType, config: Partial<UiPartitionFieldConfig>) => void;
  forceSelection: boolean;
  options: ComboBoxOption[];
  isModelPlotEnabled: boolean;
}

interface EntityControlState {
  selectedOptions: ComboBoxOption[] | undefined;
  isLoading: boolean;
  options: ComboBoxOption[] | undefined;
  isEntityConfigPopoverOpen: boolean;
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
    isEntityConfigPopoverOpen: false,
  };

  componentDidUpdate(prevProps: EntityControlProps) {
    const { entity, forceSelection, isLoading, options: propOptions } = this.props;
    const { options: stateOptions, selectedOptions } = this.state;

    const { fieldValue } = entity;

    let selectedOptionsUpdate: ComboBoxOption[] | undefined = selectedOptions;
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

  onChange = (selectedOptions: ComboBoxOption[]) => {
    const options = selectedOptions.length > 0 ? selectedOptions : undefined;
    this.setState({
      selectedOptions: options,
    });

    const fieldValue =
      Array.isArray(options) && options[0].value?.value !== null
        ? options[0].value?.value ?? null
        : null;
    this.props.entityFieldValueChanged(this.props.entity, fieldValue);
  };

  onManualInput = (inputValue: string) => {
    const normalizedSearchValue = inputValue.trim().toLowerCase();
    if (!normalizedSearchValue) {
      return;
    }
    const manualInputValue: ComboBoxOption = {
      label: inputValue,
      value: {
        value: inputValue,
      },
    };
    this.setState({
      selectedOptions: [manualInputValue],
    });
    this.props.entityFieldValueChanged(this.props.entity, inputValue);
  };

  onSearchChange = (searchValue: string) => {
    this.setState({
      isLoading: true,
      options: [],
    });
    this.props.onSearchChange(this.props.entity, searchValue);
  };

  renderOption = (option: ComboBoxOption, searchValue: string) => {
    const highlightedLabel = <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>;
    return option.value?.maxRecordScore ? (
      <EuiHealth color={getSeverityColor(option.value.maxRecordScore)}>
        {highlightedLabel}
      </EuiHealth>
    ) : (
      highlightedLabel
    );
  };

  render() {
    const { entity, forceSelection, isModelPlotEnabled, config, onConfigChange } = this.props;
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
        onCreateOption={this.onManualInput}
        customOptionText={i18n.translate('xpack.ml.timeSeriesExplorer.setManualInputHelperText', {
          defaultMessage: 'No matching values',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={this.onChange}
        onSearchChange={this.onSearchChange}
        isClearable={false}
        renderOption={this.renderOption}
        data-test-subj={`mlSingleMetricViewerEntitySelection ${entity.fieldName}`}
        prepend={
          <EntityConfig
            entity={entity}
            isModelPlotEnabled={isModelPlotEnabled}
            config={config}
            onConfigChange={onConfigChange}
          />
        }
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
          {control}
        </EuiFormRow>
      </EuiFlexItem>
    );
  }
}
