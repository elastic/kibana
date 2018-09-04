/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';

export class PolicySelection extends Component {
  static propTypes = {
    fetchPolicies: PropTypes.func.isRequired,
    setSelectedPolicy: PropTypes.func.isRequired,

    selectedPolicyName: PropTypes.string.isRequired,
    policies: PropTypes.array.isRequired,
  };

  componentDidMount() {
    this.props.fetchPolicies();
  }
  selectPolicy(policyName) {
    const policy = this.props.policies.find(policy => policy.name === policyName);
    this.props.setSelectedPolicy(policy);
  }

  render() {
    const { policies, selectedPolicyName } = this.props;
    let existingPoliciesSelect;
    const policiesExist = policies.length > 0;
    if (!policiesExist) {
      return null;
    }
    if (policiesExist) {
      const options = policies.map(item => ({ value: item.name, text: item.name }));
      options.unshift({
        value: '',
        text: '-- New Policy --',
      });
      existingPoliciesSelect = (
        <EuiFlexItem>
          <EuiFormRow label="Existing policies">
            <EuiSelect
              options={options}
              value={selectedPolicyName || ' '}
              onChange={async e => {
                await this.selectPolicy(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }

    return (
      <EuiDescribedFormGroup
        title={<h4>Select or create a policy</h4>}
        titleSize="s"
        description={`An index lifecycle policy is a
          blueprint for transitioning your data over time.
          You can create a new policy${policiesExist ? ' or edit an existing policy and save it with a new name.' : '.'}`}
        fullWidth
      >
        <EuiFlexGroup alignItems="center">
          {existingPoliciesSelect}
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton onClick={() => this.selectPolicy()}>Create new policy</EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
    );
  }
}
