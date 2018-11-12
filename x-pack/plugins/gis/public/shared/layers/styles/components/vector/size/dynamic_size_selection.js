/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiComboBox,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiRange
} from '@elastic/eui';


export class DynamicSizeSelection extends React.Component {

  constructor() {
    super();
    this.state = {
      comboBoxOptions: null
    };
  }

  _onMinSizeChange = (e) => {
    console.warn('must implement');
  };

  _onMaxSizeChange = (e) => {
    console.warn('must implement');
  };

  _onFieldSelected = (e) => {
    console.warn('musgit dt implement');
  };

  render() {

    //todo: this is a copy-paste from dynamic_color_selectios: needs refactoring to extract out commonalities
    const options = this.props.fields.map(field => {
      return { label: field.label, value: field };
    });

    if (this.props.selectedOptions) {
      const { color, field } = this.props.selectedOptions;
      if (!this.state.comboBoxOptions && field) {
        const selectedValue = options.find(({ value }) => {
          return value.name === field.name;
        });
        this.state.comboBoxOptions = selectedValue ? [selectedValue] : [];
      }
      if (!this.state.selectedColorRamp && color) {
        this.state.selectedColorRamp = color;
      }
      if (!this.state.comboBoxOptions) this.state.comboBoxOptions = [];
    } else {
      this.state.comboBoxOptions = [];
    }

    const minSize = this.props.selectedOptions ? this.props.selectedOptions.minSize : 0;
    const maxSize = this.props.selectedOptions ? this.props.selectedOptions.maxSize : 0;


    return (
      <Fragment>
        <EuiComboBox
          selectedOptions={this.state.comboBoxOptions }
          options={options}
          onChange={this._onFieldSelected}
          singleSelection={{}}
          fullWidth
        />
        <EuiSpacer size="m"/>
        <EuiFormRow>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label="Min size"
                compressed
              >
                <EuiRange
                  min={0}
                  max={100}
                  value={minSize.toString()}
                  onChange={this._onMinZoomChange}
                  showInput
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label="Max size"
                compressed
              >
                <EuiRange
                  min={0}
                  max={100}
                  value={maxSize.toString()}
                  onChange={this._onMaxZoomChange}
                  showInput
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </Fragment>
    );
  }
}

{/*<EuiFormRow>*/}
{/*<EuiComboBox*/}
{/*selectedOptions={this.state.comboBoxOptions}*/}
{/*options={options}*/}
{/*onChange={this._onFieldSelected}*/}
{/*singleSelection={{}}*/}
{/*fullWidth*/}
{/*/>*/}
{/*<EuiSpacer size="m" />*/}
{/*</EuiFormRow>*/}
