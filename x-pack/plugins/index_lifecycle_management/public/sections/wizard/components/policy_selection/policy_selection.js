/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiText
} from '@elastic/eui';

export class PolicySelection extends Component {
  static propTypes = {
    fetchPolicies: PropTypes.func.isRequired,
    setSelectedPolicy: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,

    existingPolicyName: PropTypes.string.isRequired,
    policies: PropTypes.array.isRequired
  };

  componentWillMount() {
    this.props.fetchPolicies();
  }

  selectPolicy(policy) {
    this.props.setSelectedPolicy(policy);
    this.props.done();
  }

  render() {
    const { policies, existingPolicyName } = this.props;

    return (
      <div className="euiAnimateContentLoad">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={true}>
            <EuiTitle>
              <h4>Select a policy to start from</h4>
            </EuiTitle>
            <EuiText>
              <p>
                You can edit existing policies and save them under a new name
                later
              </p>
            </EuiText>
          </EuiFlexItem>
          {/* <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiHealth color="danger">
                  Hot
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color="accent">
                  Warm
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color="primary">
                  Cold
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color="text">
                  Delete
                </EuiHealth>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem> */}
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGrid columns={4}>
          <EuiFlexItem>
            <EuiPanel
              style={{ textAlign: 'center' }}
              onClick={() => this.selectPolicy(null)}
            >
              <EuiIcon type="plusInCircle" />
              <EuiTitle size="s">
                <p>New policy</p>
              </EuiTitle>
            </EuiPanel>
          </EuiFlexItem>
          {policies.map(item => (
            <EuiFlexItem key={item.name}>
              <EuiPanel
                style={{ textAlign: 'center' }}
                onClick={() => this.selectPolicy(item)}
              >
                <EuiTitle size="s">
                  <p>
                    {item.name}
                    {existingPolicyName === item.name ? '*' : ''}
                  </p>
                </EuiTitle>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </div>
    );
  }
}
