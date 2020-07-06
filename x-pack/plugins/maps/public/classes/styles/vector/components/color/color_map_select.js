/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiSpacer, EuiSelect, EuiSuperSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ColorStopsOrdinal } from './color_stops_ordinal';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { ColorStopsCategorical } from './color_stops_categorical';
import { i18n } from '@kbn/i18n';

const CUSTOM_COLOR_MAP = 'CUSTOM_COLOR_MAP';

export class ColorMapSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customColorMap === prevState.prevPropsCustomColorMap) {
      return null;
    }

    return {
      prevPropsCustomColorMap: nextProps.customColorMap, // reset tracker to latest value
      customColorMap: nextProps.customColorMap, // reset customColorMap to latest value
    };
  }

  _renderColorMapToggle() {
    const options = [
      {
        value: COLOR_MAP_TYPE.ORDINAL,
        text: i18n.translate('xpack.maps.styles.dynamicColorSelect.quantitativeLabel', {
          defaultMessage: 'As number',
        }),
      },
      {
        value: COLOR_MAP_TYPE.CATEGORICAL,
        text: i18n.translate('xpack.maps.styles.dynamicColorSelect.qualitativeLabel', {
          defaultMessage: 'As category',
        }),
      },
    ];

    const selectedValue = this.props.styleProperty.isOrdinal()
      ? COLOR_MAP_TYPE.ORDINAL
      : COLOR_MAP_TYPE.CATEGORICAL;

    return (
      <EuiSelect
        options={options}
        value={selectedValue}
        onChange={this.props.onColorMapTypeChange}
        aria-label={i18n.translate(
          'xpack.maps.styles.dynamicColorSelect.qualitativeOrQuantitativeAriaLabel',
          {
            defaultMessage:
              'Choose `As number` to map by number in a color range, or `As category`to categorize by color palette.',
          }
        )}
        compressed
      />
    );
  }

  _onColorMapSelect = (selectedValue) => {
    const useCustomColorMap = selectedValue === CUSTOM_COLOR_MAP;
    this.props.onChange({
      color: useCustomColorMap ? null : selectedValue,
      useCustomColorMap,
      type: this.props.colorMapType,
    });
  };

  _onCustomColorMapChange = ({ colorStops, isInvalid }) => {
    // Manage invalid custom color map in local state
    if (isInvalid) {
      this.setState({ customColorMap: colorStops });
      return;
    }

    this.props.onChange({
      useCustomColorMap: true,
      customColorMap: colorStops,
      type: this.props.colorMapType,
    });
  };

  _renderColorStopsInput() {
    if (!this.props.isCustomOnly && !this.props.useCustomColorMap) {
      return null;
    }

    let colorStopEditor;
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      colorStopEditor = (
        <ColorStopsOrdinal
          colorStops={this.state.customColorMap}
          onChange={this._onCustomColorMapChange}
          swatches={this.props.swatches}
        />
      );
    } else {
      colorStopEditor = (
        <ColorStopsCategorical
          colorStops={this.state.customColorMap}
          field={this.props.styleProperty.getField()}
          getValueSuggestions={this.props.styleProperty.getValueSuggestions}
          onChange={this._onCustomColorMapChange}
          swatches={this.props.swatches}
        />
      );
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem>{colorStopEditor}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  _renderColorMapSelections() {
    if (this.props.isCustomOnly) {
      return null;
    }

    const colorMapOptionsWithCustom = [
      {
        value: CUSTOM_COLOR_MAP,
        inputDisplay: this.props.customOptionLabel,
        'data-test-subj': `colorMapSelectOption_${CUSTOM_COLOR_MAP}`,
      },
      ...this.props.colorMapOptions,
    ];

    let valueOfSelected;
    if (this.props.useCustomColorMap) {
      valueOfSelected = CUSTOM_COLOR_MAP;
    } else {
      valueOfSelected = this.props.colorMapOptions.find(
        (option) => option.value === this.props.color
      )
        ? this.props.color
        : '';
    }

    const toggle = this.props.showColorMapTypeToggle ? (
      <EuiFlexItem grow={false}>{this._renderColorMapToggle()}</EuiFlexItem>
    ) : null;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize={'none'}>
          {toggle}
          <EuiFlexItem>
            <EuiSuperSelect
              compressed
              options={colorMapOptionsWithCustom}
              onChange={this._onColorMapSelect}
              valueOfSelected={valueOfSelected}
              hasDividers={true}
              data-test-subj={`colorMapSelect_${this.props.styleProperty.getStyleName()}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderColorMapSelections()}
        {this._renderColorStopsInput()}
      </Fragment>
    );
  }
}
