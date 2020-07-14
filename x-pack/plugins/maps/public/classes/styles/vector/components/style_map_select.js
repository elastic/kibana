/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';

const CUSTOM_MAP = 'CUSTOM_MAP';

export class StyleMapSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customMapStops === prevState.prevPropsCustomMapStops) {
      return null;
    }

    return {
      prevPropsCustomMapStops: nextProps.customMapStops, // reset tracker to latest value
      customMapStops: nextProps.customMapStops, // reset customMapStops to latest value
    };
  }

  _onMapSelect = (selectedValue) => {
    const useCustomMap = selectedValue === CUSTOM_MAP;
    this.props.onChange({
      selectedMapId: useCustomMap ? null : selectedValue,
      useCustomMap,
    });
  };

  _onCustomMapChange = ({ customMapStops, isInvalid }) => {
    // Manage invalid custom map in local state
    if (isInvalid) {
      this.setState({ customMapStops });
      return;
    }

    this.props.onChange({
      useCustomMap: true,
      customMapStops,
    });
  };

  _renderCustomStopsInput() {
    return !this.props.isCustomOnly && !this.props.useCustomMap
      ? null
      : this.props.renderCustomStopsInput(this._onCustomMapChange);
  }

  _renderMapSelect() {
    if (this.props.isCustomOnly) {
      return null;
    }

    const mapOptionsWithCustom = [
      {
        value: CUSTOM_MAP,
        inputDisplay: this.props.customOptionLabel,
      },
      ...this.props.options,
    ];

    let valueOfSelected;
    if (this.props.useCustomMap) {
      valueOfSelected = CUSTOM_MAP;
    } else {
      valueOfSelected = this.props.options.find(
        (option) => option.value === this.props.selectedMapId
      )
        ? this.props.selectedMapId
        : '';
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={mapOptionsWithCustom}
          onChange={this._onMapSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
          compressed
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderMapSelect()}
        {this._renderCustomStopsInput()}
      </Fragment>
    );
  }
}
