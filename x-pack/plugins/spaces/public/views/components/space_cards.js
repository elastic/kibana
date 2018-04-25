/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SpaceCard } from './space_card';
import {
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export class SpaceCards extends Component {
  render() {
    return (
      <EuiFlexGroup gutterSize="l" justifyContent="spaceEvenly" className="spacesGroup">
        {this.props.spaces.map(this.renderSpace)}
      </EuiFlexGroup>
    );
  }

    renderSpace = (space) => (
      <EuiFlexItem key={space.id}>
        <SpaceCard space={space} onClick={() => {}} />
      </EuiFlexItem>
    );
}

SpaceCards.propTypes = {
  spaces: PropTypes.array.isRequired
};