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
      type: VectorStyle.STYLE_TYPE.STATIC,
      ordinalFields: null
    };
  }

  _isDynamic() {
    return this.state.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOrdinalFields();
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
        ordinalFields: ordinalFields
      });
    }
  }

  _renderStaticAndDynamicStyles() {

    const changeToStaticStyle = (newOptions) => {
      const staticStyle = {
        type: VectorStyle.STYLE_TYPE.STATIC,
        options: newOptions
      };
      this.props.handlePropertyChange(this.props.property, staticStyle);
      return staticStyle;
    };

    const changeToDynamicStyle = (field) => {
      const dynamicStyle = {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: field ? field.value : undefined
        }
      };
      this.props.handlePropertyChange(this.props.property, dynamicStyle);
      return dynamicStyle;
    };


    const onTypeToggle = (e) => {
      const styleType = e.target.checked ? VectorStyle.STYLE_TYPE.DYNAMIC : VectorStyle.STYLE_TYPE.STATIC;
      this.setState({
        type: styleType
      });
    };

    let styleSelector;
    const selectedOptions = (this.props.styleDescriptor && this.props.styleDescriptor.options) ? this.props.styleDescriptor.options : null;
    if (this._isDynamic()) {
      if (this.state.ordinalFields !== null) {
        this._lastDynamicOptions = selectedOptions;
        const Selector = this.props.DynamicSelector;
        styleSelector = (<Selector
          fields={this.state.ordinalFields}
          onChange={changeToDynamicStyle}
          selectedOptions={selectedOptions}
        />);
      } else {
        styleSelector = null;
      }
    } else {
      this._lastStaticOptions = selectedOptions;
      const Selector = this.props.StaticSelector;
      styleSelector = <Selector changeOptions={changeToStaticStyle} selectedOptions={selectedOptions}/>;
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
              checked={this._isDynamic()}
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
    if (this.state.styleDescriptor === null) {
      this.state.styleDescriptor = this.props.styleDescriptor ?  this.props.styleDescriptor : null;
    }
    return this._renderStaticAndDynamicStyles();
  }

}



