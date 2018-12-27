/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';

import { SingleFieldSelect } from '../../../../shared/components/single_field_select';

export class OnExpression extends Component {

  state = {
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

  _onLeftFieldChange = (selectedFields) => {
    const selectedField = selectedFields.length > 0 ? selectedFields[0].value : null;
    this.props.onLeftChange(selectedField.name);
  };

  _renderLeftFieldSelect() {
    const {
      leftValue,
      leftFields,
    } = this.props;

    const options = leftFields.map(field => {
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
    const selectedOptions = leftFieldOption
      ? [leftFieldOption]
      : [];

    return (
      <EuiComboBox
        placeholder="Select field"
        singleSelection={true}
        isClearable={false}
        options={options}
        selectedOptions={selectedOptions}
        onChange={this._onLeftFieldChange}
      />
    );
  }

  _renderRightFieldSelect() {
    const filterStringOrNumberFields = (field) => {
      return field.type === 'string' || field.type === 'number';
    };

    return (
      <SingleFieldSelect
        placeholder="Select field"
        value={this.props.rightValue}
        onChange={this.props.onRightChange}
        filterField={filterStringOrNumberFields}
        fields={this.props.rightFields}
        isClearable={false}
      />
    );
  }

  render() {
    const {
      leftValue,
      rightValue,
    } = this.props;

    return (
      <EuiPopover
        id="onPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        withTitle
        initialFocus="body" /* avoid initialFocus on Combobox */
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description="ON"
            value={
              leftValue && rightValue
                ? `left.${leftValue} = right.${rightValue}`
                : '-- select --'
            }
          />
        }
      >
        <div style={{ width: 300 }}>
          <EuiPopoverTitle>ON</EuiPopoverTitle>
          <EuiFormRow
            label="left field"
          >
            {this._renderLeftFieldSelect()}
          </EuiFormRow>
          <EuiFormRow
            label="right field"
          >
            {this._renderRightFieldSelect()}
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
}

OnExpression.propTypes = {
  leftValue: PropTypes.string,
  leftFields: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  onLeftChange: PropTypes.func.isRequired,

  rightValue: PropTypes.string,
  rightFields: PropTypes.object.isRequired, // indexPattern.fields IndexedArray object
  onRightChange: PropTypes.func.isRequired,
};
