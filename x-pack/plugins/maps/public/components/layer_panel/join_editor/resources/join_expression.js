/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';

import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';
import { SingleFieldSelect } from '../../../../shared/components/single_field_select';

import {
  indexPatternService,
} from '../../../../kibana_services';

export class JoinExpression extends Component {

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

  _onRightSourceChange = async (indexPatternId) => {
    try {
      const indexPattern = await indexPatternService.get(indexPatternId);
      this.props.onRightSourceChange({
        indexPatternId,
        indexPatternTitle: indexPattern.title,
      });
    } catch (err) {
      // do not call onChange with when unable to get indexPatternId
    }
  }

  _onLeftFieldChange = (selectedFields) => {
    this.props.onLeftFieldChange(_.get(selectedFields, '[0].value.name', null));
  };

  _renderLeftFieldSelect() {
    const {
      leftValue,
      leftFields,
    } = this.props;

    if (!leftFields) {
      return null;
    }

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
      <EuiFormRow
        label="Left field"
      >
        <EuiComboBox
          placeholder="Select field"
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

    return (
      <EuiFormRow
        label="Right source"
      >
        <IndexPatternSelect
          placeholder="Select index pattern"
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

    const filterStringOrNumberFields = (field) => {
      return field.type === 'string' || field.type === 'number';
    };

    return (
      <EuiFormRow
        label="Right field"
      >
        <SingleFieldSelect
          placeholder="Select field"
          value={this.props.rightValue}
          onChange={this.props.onRightFieldChange}
          filterField={filterStringOrNumberFields}
          fields={this.props.rightFields}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  _getExpressionValue() {
    const {
      leftSourceName,
      leftValue,
      rightSourceName,
      rightValue,
    } = this.props;
    if (leftSourceName && leftValue && rightSourceName && rightValue) {
      return `${leftSourceName}:${leftValue} with ${rightSourceName}:${rightValue}`;
    }

    return '-- select --';
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
        withTitle
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
          <EuiPopoverTitle>Join</EuiPopoverTitle>
          <EuiFormRow
            label="Left source"
          >
            <EuiComboBox
              selectedOptions={[{ value: leftSourceName, label: leftSourceName }]}
              isDisabled
            />
          </EuiFormRow>
          {this._renderLeftFieldSelect()}

          {this._renderRightSourceSelect()}

          {this._renderRightFieldSelect()}
        </div>
      </EuiPopover>
    );
  }
}

JoinExpression.propTypes = {
  // Left source props (static - can not change)
  leftSourceName: PropTypes.string,

  // Left field props
  leftValue: PropTypes.string,
  leftFields: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })),
  onLeftFieldChange: PropTypes.func.isRequired,

  // Right source props
  rightSourceIndexPatternId: PropTypes.string,
  rightSourceName: PropTypes.string,
  onRightSourceChange: PropTypes.func.isRequired,

  // Right field props
  rightValue: PropTypes.string,
  rightFields: PropTypes.object, // indexPattern.fields IndexedArray object
  onRightFieldChange: PropTypes.func.isRequired,
};
