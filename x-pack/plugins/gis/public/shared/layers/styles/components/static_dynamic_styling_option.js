/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';
import _ from 'lodash';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiFormRow,
  EuiButtonToggle
} from '@elastic/eui';


export class StaticDynamicStyleSelector extends React.Component {

  constructor() {
    super();
    this.state = {
      isDynamic: false,
    };
  }

  _canBeDynamic() {
    return this.props.ordinalFields.length > 0;
  }

  _isDynamic() {
    if (!this.props.styleDescriptor) {
      return false;
    }
    return this.props.styleDescriptor.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  componentDidMount() {
    this.setState({
      isDynamic: this._isDynamic()
    });
  }

  componentDidUpdate() {
    const isDynamic = this._isDynamic();
    if (this.state.isDynamic !== isDynamic) {
      this.setState({
        isDynamic
      });
    }
  }

  _getStyleUpdateFunction = type => {
    const { property } = this.props;
    return options => {
      const styleDescriptor = {
        type,
        options
      };
      this.props.handlePropertyChange(property, styleDescriptor);
    };
  };

  _onTypeToggle = (() => {
    let lastOptions = {
      // TODO: Move default to central location with other defaults
      color: 'rgba(0,0,0,0.4)'
    };
    const { DYNAMIC, STATIC } = VectorStyle.STYLE_TYPE;
    return ({ target }, currentOptions) => {
      const selectedStyleType = target.checked ? DYNAMIC : STATIC;
      this.setState({
        isDynamic: target.checked
      }, () => {
        if (!_.isEqual(lastOptions, currentOptions)) {
          lastOptions && this._getStyleUpdateFunction(selectedStyleType)(lastOptions);
          lastOptions = currentOptions;
        }
      });
    };
  })();

  _renderStyleSelector(currentOptions) {
    let styleSelector;
    if (this.state.isDynamic) {
      if (this._canBeDynamic()) {
        const DynamicSelector = this.props.DynamicSelector;
        styleSelector = (
          <DynamicSelector
            fields={this.props.ordinalFields}
            onChange={this._getStyleUpdateFunction(VectorStyle.STYLE_TYPE.DYNAMIC)}
            selectedOptions={currentOptions}
          />
        );
      } else {
        styleSelector = null;
      }
    } else {
      const StaticSelector = this.props.StaticSelector;
      styleSelector = (
        <StaticSelector
          changeOptions={this._getStyleUpdateFunction(VectorStyle.STYLE_TYPE.STATIC)}
          selectedOptions={currentOptions}
        />
      );
    }
    return styleSelector;
  }

  render() {
    const currentOptions = _.get(this.props, 'styleDescriptor.options');
    const dynamicTooltipContent =
      this.state.isDynamic ? "Disable dynamic styling." : "Enable dynamic styling.";

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label={this.props.name}>
            {this._renderStyleSelector(currentOptions)}
          </EuiFormRow>
        </EuiFlexItem>
        {this._canBeDynamic() &&
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiToolTip
                content={dynamicTooltipContent}
                delay="long"
              >
                <EuiButtonToggle
                  label={dynamicTooltipContent}
                  iconType="link"
                  onChange={e => this._onTypeToggle(e, currentOptions)}
                  isEmpty={!this.state.isDynamic}
                  fill={this.state.isDynamic}
                  isIconOnly
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
}
