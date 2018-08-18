/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export class JobCreate extends Component {
  static propTypes = {
    createJob: PropTypes.func,
  }

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center" style={{ maxWidth: 1200, width: '100%', marginTop: 16, marginBottom: 16 }}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>Create rollup job</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

