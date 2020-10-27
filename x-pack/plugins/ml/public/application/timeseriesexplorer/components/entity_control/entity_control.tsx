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
  EuiButtonIcon,
  EuiSwitch,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiText,
  EuiRadioGroup,
  EuiHorizontalRule,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
} from '@elastic/eui';
import { EntityFieldType } from '../../../../../common/types/anomalies';
import { PartitionFieldConfig } from '../../../../../common/types/storage';
import { DeepPartial } from '../../../../../common/types/common';

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

export interface EntityControlProps {
  entity: Entity;
  entityFieldValueChanged: (entity: Entity, fieldValue: any) => void;
  isLoading: boolean;
  onSearchChange: (entity: Entity, queryTerm: string) => void;
  config: PartitionFieldConfig;
  onConfigChange: (fieldType: EntityFieldType, config: DeepPartial<PartitionFieldConfig>) => void;
  forceSelection: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
  isModelPlotEnabled: boolean;
}

interface EntityControlState {
  selectedOptions: Array<EuiComboBoxOptionOption<string>> | undefined;
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>> | undefined;
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

  renderOption = (option: EuiComboBoxOptionOption) => {
    const { label } = option;
    return label === EMPTY_FIELD_VALUE_LABEL ? <i>{label}</i> : label;
  };

  private readonly sortOptions = [
    {
      id: 'anomaly_score',
      label: i18n.translate('xpack.ml.timeSeriesExplorer.sortByScoreLabel', {
        defaultMessage: 'Anomaly score',
      }),
    },
    {
      id: 'name',
      label: i18n.translate('xpack.ml.timeSeriesExplorer.sortByNameLabel', {
        defaultMessage: 'Name',
      }),
    },
  ];

  private readonly orderOptions = [
    {
      id: 'asc',
      label: i18n.translate('xpack.ml.timeSeriesExplorer.ascOptionsOrderLabel', {
        defaultMessage: 'asc',
      }),
    },
    {
      id: 'desc',
      label: i18n.translate('xpack.ml.timeSeriesExplorer.descOptionsOrderLabel', {
        defaultMessage: 'desc',
      }),
    },
  ];

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
        data-test-subj={`mlSingleMetricViewerEntitySelection ${entity.fieldName}`}
        prepend={
          <EuiPopover
            ownFocus
            button={
              <EuiButtonIcon
                color="text"
                iconSize="xxl"
                iconType="gear"
                aria-label={i18n.translate('xpack.ml.timeSeriesExplorer.editControlConfiguration', {
                  defaultMessage: 'Edit field configuration',
                })}
                onClick={() => {
                  this.setState({
                    isEntityConfigPopoverOpen: !this.state.isEntityConfigPopoverOpen,
                  });
                }}
                data-test-subj={`mlSingleMetricViewerEntitySelectionConfigButton_${entity.fieldName}`}
              />
            }
            isOpen={this.state.isEntityConfigPopoverOpen}
            closePopover={() => {
              this.setState({
                isEntityConfigPopoverOpen: false,
              });
            }}
          >
            <EuiText>
              <EuiFlexGroup gutterSize={'xs'} alignItems={'baseline'}>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.ml.timeSeriesExplorer.anomalousOnlyLabel"
                        defaultMessage="Anomalous only"
                      />
                    }
                    checked={!!this.props.config?.anomalousOnly}
                    onChange={(e) => {
                      this.props.onConfigChange(this.props.entity.fieldType, {
                        anomalousOnly: e.target.checked,
                      });
                    }}
                    compressed
                    data-test-subj={`mlSingleMetricViewerEntitySelectionConfigAnomalousOnly_${entity.fieldName}`}
                  />
                </EuiFlexItem>
                {!this.props.config?.anomalousOnly ? (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      position="top"
                      content={
                        this.props.isModelPlotEnabled ? (
                          <FormattedMessage
                            id="xpack.ml.timeSeriesExplorer.nonAnomalousResultsInfo"
                            defaultMessage="You will be suggested to select values for all possible model plot results"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.ml.timeSeriesExplorer.nonAnomalousResultsInfo"
                            defaultMessage="You will be suggested to select values for all records created during the job lifetime"
                          />
                        )
                      }
                    >
                      <EuiIcon tabIndex={0} type="iInCircle" color={'accent'} />
                    </EuiToolTip>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>

              <EuiHorizontalRule margin="s" />
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.sortByLabel"
                    defaultMessage="Sort by"
                  />
                }
              >
                <EuiRadioGroup
                  options={this.sortOptions}
                  idSelected={this.props.config?.sort?.by}
                  onChange={(id) => {
                    this.props.onConfigChange(this.props.entity.fieldType, {
                      sort: {
                        ...(this.props.config?.sort ? this.props.config.sort : {}),
                        by: id,
                      },
                    });
                  }}
                  compressed
                  data-test-subj={`mlSingleMetricViewerEntitySelectionConfigSortBy_${entity.fieldName}`}
                />
              </EuiFormRow>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.orderLabel"
                    defaultMessage="Order"
                  />
                }
              >
                <EuiRadioGroup
                  options={this.orderOptions}
                  idSelected={this.props.config?.sort?.order}
                  onChange={(id) => {
                    this.props.onConfigChange(this.props.entity.fieldType, {
                      sort: {
                        ...(this.props.config?.sort ? this.props.config.sort : {}),
                        order: id,
                      },
                    });
                  }}
                  compressed
                  data-test-subj={`mlSingleMetricViewerEntitySelectionConfigOrder_${entity.fieldName}`}
                />
              </EuiFormRow>
            </EuiText>
          </EuiPopover>
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
