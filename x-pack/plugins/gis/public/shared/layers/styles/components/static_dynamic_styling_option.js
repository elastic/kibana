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
  EuiSwitch,
  EuiFormLabel,
  EuiSpacer
} from '@elastic/eui';


export class StaticDynamicStyleSelector extends React.Component {

  constructor() {
    super();
    this._isMounted = false;
    this.state = {
      ordinalFields: null,
      isDynamic: false,
      styleDescriptor: VectorStyle.STYLE_TYPE.STATIC
    };
  }

  _isDynamic() {
    if (!this.props.styleDescriptor) {
      return false;
    }
    return this.props.styleDescriptor.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOrdinalFields();
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
    if (isDynamic) {
      this._loadOrdinalFields();
    }
  }

  async _loadOrdinalFields() {
    if (!this._isMounted) {
      return;
    }
    //check if fields are the same..
    const ordinalFields = await this.props.layer.getOrdinalFields();
    const eqls = _.isEqual(ordinalFields, this.state.ordinalFields);
    if (!eqls) {
      this.setState({
        ordinalFields
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
      if (this.state.ordinalFields && this.state.ordinalFields.length) {
        const DynamicSelector = this.props.DynamicSelector;
        styleSelector = (
          <DynamicSelector
            fields={this.state.ordinalFields}
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

  _renderStaticAndDynamicStyles = () => {
    const currentOptions = _.get(this.props, 'styleDescriptor.options');
    return (
      <div>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiFormLabel style={{ marginBottom: 0 }}>
              {this.props.name}
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={'Dynamic'}
              checked={this.state.isDynamic}
              onChange={e => this._onTypeToggle(e, currentOptions)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        {this._renderStyleSelector(currentOptions)}
      </div>
    );
  };

  render() {
    return this._renderStaticAndDynamicStyles();
  }
}
