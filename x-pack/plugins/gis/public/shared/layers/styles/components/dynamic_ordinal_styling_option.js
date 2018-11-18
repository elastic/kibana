/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import {
  EuiComboBox,
  EuiSpacer
} from '@elastic/eui';

import { ColorRampSelector } from './vector/color/color_ramp_selector';
import { SizeRangeSelector } from './vector/size/size_range_selector';

export const styleTypes = {
  COLOR_RAMP: 'color_ramp',
  SIZE_RANGE: 'size_range'
};

export class DynamicOrdinalStyleOption extends React.Component {

  constructor() {
    super();
    this.state = {
      fieldSelection: ''
    };
  }


  _onFieldSelected = (fieldSelection) => {
    this.setState({
      fieldSelection: fieldSelection
    });
    this._fireChange(fieldSelection, {});
  };


  _fireChange(newField, dynamicOptions) {
    let newOptions = { ...this.props.selectedOptions };
    newOptions.field = newField && newField.length ? newField[0].value : this.props.selectedOptions.field;
    newOptions = { ...newOptions, ...dynamicOptions };
    this.props.onChange(newOptions);
  }

  _getComboBoxOptionsFromFields() {
    return this.props.fields.map(field => {
      return { label: field.label, value: field };
    });
    // if (this.props.selectedOptions) {
    //   const { color, field } = this.props.selectedOptions;
    //   if (!this.state.comboBoxOptions && field) {
    //     const selectedValue = options.find(({ value }) => {
    //       return value.name === field.name;
    //     });
    //     this.state.comboBoxOptions = selectedValue ? [selectedValue] : [];
    //   }
    //   if (!this.state.selectedColorRamp && color) {
    //     this.state.selectedColorRamp = color;
    //   }
    //   if (!this.state.comboBoxOptions) this.state.comboBoxOptions = [];
    // } else {
    //   this.state.comboBoxOptions = [];
    // }

  }

  _getFieldSelectionFromPropsAndState(options) {

    if (this.state.fieldSelection) {
      return this.state.fieldSelection;
    }

    if (this.props.selectedOptions) {
      if (this.props.selectedOptions.field) {
        const selectedValue = options.find(({ value }) => {
          return value.name === this.props.selectedOptions.field.name;
        });
        return (selectedValue) ? [selectedValue] : [];
      }
    } else {
      return [];
    }
  }

  _renderStyleInput() {
    const {
      selectedOptions,
      type,
    } = this.props;

    // do not show style input until field has been selected
    if (!_.has(selectedOptions, 'field')) {
      return;
    }

    const onChange = (additionalOptions) => {
      this._fireChange(this.state.fieldSelection, additionalOptions);
    };

    switch (type) {
      case styleTypes.COLOR_RAMP:
        return (
          <ColorRampSelector
            onChange={onChange}
            color={_.get(selectedOptions, 'color')}
          />
        );
      case styleTypes.SIZE_RANGE:
        return (
          <SizeRangeSelector
            onChange={onChange}
            minSize={_.get(selectedOptions, 'minSize')}
            maxSize={_.get(selectedOptions, 'maxSize')}
          />
        );
      default:
        throw new Error(`Unhandled style type ${type}`);
    }
  }

  render() {
    const ordinalFieldComboboxOptions = this._getComboBoxOptionsFromFields();
    const fieldSelection = this._getFieldSelectionFromPropsAndState(ordinalFieldComboboxOptions);

    return (
      <Fragment>
        <EuiComboBox
          selectedOptions={fieldSelection}
          options={ordinalFieldComboboxOptions}
          onChange={this._onFieldSelected}
          singleSelection={{}}
          fullWidth
        />

        <EuiSpacer size="m" />

        {this._renderStyleInput()}

      </Fragment>
    );
  }

}

DynamicOrdinalStyleOption.propTypes = {
  selectedOptions: PropTypes.object,
  fields: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(
    Object.keys(styleTypes).map(styleType => {
      return styleTypes[styleType];
    })
  ).isRequired,
};



