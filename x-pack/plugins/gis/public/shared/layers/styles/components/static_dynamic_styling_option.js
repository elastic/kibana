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
      dynamic: false
    };
  }

  _isDynamic() {
    if (!this.props.colorStyleDescriptor) {
      return false;
    }
    return this.props.colorStyleDescriptor.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOrdinalFields();
    this.setState({
      dynamic: this._isDynamic()
    });
  }

  componentDidUpdate() {
    const dynamic = this._isDynamic();
    if (this.state.dynamic !== dynamic) {
      this.setState({
        dynamic
      });
    }
    if (dynamic) {
      this._loadOrdinalFields();
    }
  }

  async _loadOrdinalFields() {
    const ordinalFields = await this.props.layer.getOrdinalFields();
    if (!this._isMounted) {
      return;
    }
    //check if fields are the same..
    const eqls = _.isEqual(ordinalFields, this.state.ordinalFields);
    if (!eqls) {
      this.setState({
        ordinalFields
      });
    }
  }

  _renderStaticAndDynamicStyles() {

    const changeStyle = (type, newOptions) => {
      const newStyleDescriptor = {
        type: type,
        options: newOptions
      };
      this.props.handlePropertyChange(this.props.property, newStyleDescriptor);
    };

    const changeToDynamicStyle = (newOptions) => {
      changeStyle(VectorStyle.STYLE_TYPE.DYNAMIC, newOptions);
    };

    const changeToStaticStyle = (newOptions) => {
      changeStyle(VectorStyle.STYLE_TYPE.STATIC, newOptions);
    };

    const onTypeToggle = (e) => {
      const selectdStyleType = e.target.checked ? VectorStyle.STYLE_TYPE.DYNAMIC : VectorStyle.STYLE_TYPE.STATIC;
      const lastOptions = selectdStyleType === VectorStyle.STYLE_TYPE.DYNAMIC ? this._lastDynamicOptions : this._lastStaticOptions;
      changeStyle(selectdStyleType, lastOptions);
    };

    let styleSelector;
    const currentOptions = _.get(this.props, 'colorStyleDescriptor.options', null);
    if (this.state.dynamic) {
      this._lastDynamicOptions = currentOptions;
      if (this.state.ordinalFields && this.state.ordinalFields.length) {
        const Selector = this.props.DynamicSelector;
        styleSelector = (<Selector
          fields={this.state.ordinalFields}
          onChange={changeToDynamicStyle}
          selectedOptions={currentOptions}
        />);
      } else {
        styleSelector = null;
      }
    } else {
      this._lastStaticOptions = currentOptions;
      const Selector = this.props.StaticSelector;
      styleSelector = <Selector changeOptions={changeToStaticStyle} selectedOptions={currentOptions}/>;
    }

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
              label={'Dynamic?'}
              checked={this.state.dynamic}
              onChange={onTypeToggle}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        {styleSelector}
      </div>
    );
  }

  render() {
    return this._renderStaticAndDynamicStyles();
  }

}



