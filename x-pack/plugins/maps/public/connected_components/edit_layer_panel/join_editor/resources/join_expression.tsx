/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormHelpText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IndexPatternField } from 'src/plugins/data/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDataViewSelectPlaceholder } from '../../../../../common/i18n_getters';
import { DEFAULT_MAX_BUCKETS_LIMIT } from '../../../../../common/constants';
import { SingleFieldSelect } from '../../../../components/single_field_select';
import { ValidatedNumberInput } from '../../../../components/validated_number_input';

import { getTermsFields } from '../../../../index_pattern_util';
import {
  getIndexPatternService,
  getIndexPatternSelectComponent,
} from '../../../../kibana_services';
import type { JoinField } from '../join_editor';

interface Props {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;

  // Right source props
  rightSourceIndexPatternId: string;
  rightSourceName: string;
  onRightSourceChange: ({
    indexPatternId,
    indexPatternTitle,
  }: {
    indexPatternId: string;
    indexPatternTitle: string;
  }) => void;

  // Right field props
  rightValue: string;
  rightSize?: number;
  rightFields: IndexPatternField[];
  onRightFieldChange: (term?: string) => void;
  onRightSizeChange: (size: number) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class JoinExpression extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onRightSourceChange = async (indexPatternId?: string) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    try {
      const indexPattern = await getIndexPatternService().get(indexPatternId);
      this.props.onRightSourceChange({
        indexPatternId,
        indexPatternTitle: indexPattern.title,
      });
    } catch (err) {
      // do not call onChange with when unable to get indexPatternId
    }
  };

  _onLeftFieldChange = (selectedFields: Array<EuiComboBoxOptionOption<JoinField>>) => {
    this.props.onLeftFieldChange(_.get(selectedFields, '[0].value.name', null));
  };

  _renderLeftFieldSelect() {
    const { leftValue, leftFields } = this.props;

    if (!leftFields) {
      return null;
    }

    const options = leftFields.map((field) => {
      return {
        value: field,
        label: field.label,
      };
    });

    let leftFieldOption;
    if (leftValue) {
      leftFieldOption = options.find((option) => {
        const field = option.value;
        return field.name === leftValue;
      });
    }
    const selectedOptions = leftFieldOption ? [leftFieldOption] : [];

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.leftFieldLabel', {
          defaultMessage: 'Left field',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.leftSourceLabelHelpText', {
          defaultMessage: 'Left source field that contains the shared key.',
        })}
      >
        <EuiComboBox
          placeholder={getSelectFieldPlaceholder()}
          singleSelection={true}
          isClearable={false}
          options={options}
          selectedOptions={selectedOptions}
          onChange={this._onLeftFieldChange}
        />
      </EuiFormRow>
    );
  }

  _renderRightSourceSelect() {
    if (!this.props.leftValue) {
      return null;
    }
    const IndexPatternSelect = getIndexPatternSelectComponent();

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSourceLabel', {
          defaultMessage: 'Right source',
        })}
      >
        <IndexPatternSelect
          placeholder={getDataViewSelectPlaceholder()}
          indexPatternId={this.props.rightSourceIndexPatternId}
          onChange={this._onRightSourceChange}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  _renderRightFieldSelect() {
    if (!this.props.rightFields || !this.props.leftValue) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightFieldLabel', {
          defaultMessage: 'Right field',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSourceLabelHelpText', {
          defaultMessage: 'Right source field that contains the shared key.',
        })}
      >
        <SingleFieldSelect
          placeholder={getSelectFieldPlaceholder()}
          value={this.props.rightValue}
          onChange={this.props.onRightFieldChange}
          fields={getTermsFields(this.props.rightFields)}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  _renderRightFieldSizeInput() {
    if (!this.props.rightValue || !this.props.leftValue) {
      return null;
    }

    return (
      <ValidatedNumberInput
        initialValue={
          this.props.rightSize !== undefined ? this.props.rightSize : DEFAULT_MAX_BUCKETS_LIMIT
        }
        min={1}
        max={DEFAULT_MAX_BUCKETS_LIMIT}
        onChange={this.props.onRightSizeChange}
        label={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSizeLabel', {
          defaultMessage: 'Right size',
        })}
        helpText={i18n.translate('xpack.maps.layerPanel.joinExpression.rightSizeHelpText', {
          defaultMessage: 'Right field term limit.',
        })}
      />
    );
  }

  _getExpressionValue() {
    const { leftSourceName, leftValue, rightSourceName, rightValue, rightSize } = this.props;
    if (leftSourceName && leftValue && rightSourceName && rightValue) {
      return i18n.translate('xpack.maps.layerPanel.joinExpression.value', {
        defaultMessage:
          '{leftSourceName}:{leftValue} with {sizeFragment} {rightSourceName}:{rightValue}',
        values: {
          leftSourceName,
          leftValue,
          sizeFragment:
            rightSize !== undefined
              ? i18n.translate('xpack.maps.layerPanel.joinExpression.sizeFragment', {
                  defaultMessage: 'top {rightSize} terms from',
                  values: { rightSize },
                })
              : '',
          rightSourceName,
          rightValue,
        },
      });
    }

    return i18n.translate('xpack.maps.layerPanel.joinExpression.selectPlaceholder', {
      defaultMessage: '-- select --',
    });
  }

  render() {
    const { leftSourceName } = this.props;
    return (
      <EuiPopover
        id="joinPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description="Join"
            uppercase={false}
            value={this._getExpressionValue()}
          />
        }
      >
        <div style={{ width: 300 }}>
          <EuiPopoverTitle>
            <FormattedMessage
              id="xpack.maps.layerPanel.joinExpression.joinPopoverTitle"
              defaultMessage="Join"
            />
          </EuiPopoverTitle>
          <EuiFormHelpText className="mapJoinExpressionHelpText">
            <FormattedMessage
              id="xpack.maps.layerPanel.joinExpression.helpText"
              defaultMessage="Configure the shared key."
            />
          </EuiFormHelpText>
          <EuiFormRow
            label={i18n.translate('xpack.maps.layerPanel.joinExpression.leftSourceLabel', {
              defaultMessage: 'Left source',
            })}
          >
            <EuiComboBox
              selectedOptions={
                leftSourceName ? [{ value: leftSourceName, label: leftSourceName }] : []
              }
              isDisabled
            />
          </EuiFormRow>
          {this._renderLeftFieldSelect()}

          {this._renderRightSourceSelect()}

          {this._renderRightFieldSelect()}

          {this._renderRightFieldSizeInput()}
        </div>
      </EuiPopover>
    );
  }
}

function getSelectFieldPlaceholder() {
  return i18n.translate('xpack.maps.layerPanel.joinExpression.selectFieldPlaceholder', {
    defaultMessage: 'Select field',
  });
}
