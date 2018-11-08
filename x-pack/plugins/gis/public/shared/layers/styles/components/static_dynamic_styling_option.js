/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';

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
    this.state = {
      type: VectorStyle.STYLE_TYPE.STATIC
    };
  }

  _isDynamic() {
    return this.state.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  _renderStaticAndDynamicStyles() {

    const onTypeToggle = (e) => {
      const styleType = e.target.checked ? VectorStyle.STYLE_TYPE.DYNAMIC : VectorStyle.STYLE_TYPE.STATIC;
      this.setState({
        type: styleType
      });
    };

    const Selector = this._isDynamic() ? this.props.DynamicSelector : this.props.StaticSelector;
    const styleSelector = <Selector/>;

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
    return (this._renderStaticAndDynamicStyles());
  }

}



