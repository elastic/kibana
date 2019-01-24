/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { GRID_RESOLUTION } from '../../grid_resolution';
import {
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel
} from '@elastic/eui';


const OPTIONS = [
  { value: GRID_RESOLUTION.COARSE, inputDisplay: 'coarse' },
  { value: GRID_RESOLUTION.FINE, inputDisplay: 'fine' },
  { value: GRID_RESOLUTION.MOST_FINE, inputDisplay: 'finest' }
];

export class ResolutionEditor extends React.Component {

  constructor() {
    super();
    this.state =  {
      resolution: null
    };
  }

  render() {
    return (
      <Fragment>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiFormLabel style={{ marginBottom: 0 }}>
              Grid resolution
            </EuiFormLabel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiSuperSelect options={OPTIONS} valueOfSelected={this.props.resolution} onChange={this.props.onChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}
