/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiTitle,
  EuiHorizontalRule
} from '@elastic/eui';

import { Join } from './resources/join';


export class JoinEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      joins: null
    };
  }

  _renderJoins() {
    const joins = this.state.joins.map((joinDescriptor, index) => {
      const onJoinSelection = (joinDescriptor) => {
        if (this.state.joins[index]) {
          const updatedJoins = this.state.joins.slice();
          updatedJoins[index] = joinDescriptor;
          this.setState({
            joins: updatedJoins
          });
          this.props.onJoinsEdited(this.props.layer, updatedJoins);
        }
      };
      return (
        <Join
          key={index}
          join={joinDescriptor}
          layer={this.props.layer}
          onJoinSelection={onJoinSelection}
        />
      );
    });

    return (
      <EuiFlexItem>
        {joins}
      </EuiFlexItem>
    );
  }

  render() {

    if (!this.props.layer.isJoinable()) {
      return null;
    }

    if (this.state.joins === null) {
      //init state
      const joins = this.props.layer.getJoins();
      this.state.joins = joins.map(join => join.toDescriptor());
    }

    const addJoin = () => {
      const newJoin = {};
      this.setState({
        joins: this.state.joins.concat(newJoin)
      });
    };

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xs"><h5>Joins</h5></EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon iconType="plusInCircle" onClick={addJoin} aria-label="Add join" title="Add join" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiHorizontalRule margin="none"/>
        {this._renderJoins()}
      </EuiFlexGroup>
    );
  }
}
