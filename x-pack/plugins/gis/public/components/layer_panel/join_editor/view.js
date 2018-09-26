/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

import { Join } from './resources/join';


export class JoinEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      joins: []
    };
  }

  _renderJoins() {
    const joins = this.state.joins.map((join, index) => {
      return (<EuiFlexItem key={index}><Join join={join} layer={this.props.layer}/></EuiFlexItem>);
    });

    return (
      <EuiFlexGroup direction="column">
        {joins}
      </EuiFlexGroup>
    );
  }

  render() {
    if (!this.props.layer.isJoinable()) {
      return null;
    }

    const addJoin = () => {
      const newJoin = {};
      this.setState({
        joins: this.state.joins.concat(newJoin)
      });
    };

    return (
      <div>
        <div>
          {this._renderJoins()}
        </div>
        <div>
          <EuiButton onClick={addJoin}>Add join</EuiButton>
        </div>
      </div>
    );
  }
}
