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
    const { isSelectedPolicySet, policies, selectedPolicyName } = this.props;
    const policiesExist = policies.length > 0;
    if (isSelectedPolicySet) {
      return null;
    }
    let existingPoliciesSelect;
    if (policiesExist) {
      const options = policies.map(item => ({ value: item.name, text: item.name }));
      options.unshift({ value: '', text: 'Select an existing policy' });
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
        title={<h4>Select or create a lifecycle policy</h4>}
        titleSize="s"
        description={`An index lifecycle policy is a
          blueprint for transitioning your data over time.
          You can create a new policy${policiesExist ? ' or edit an existing policy and save it with a new name.' : '.'}`}
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace>
          <EuiFlexGroup  direction="column" alignItems="center" fullWidth>
            {existingPoliciesSelect}
            <EuiFlexItem>
              <h1>- OR -</h1>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton onClick={() => this.selectPolicy()}>Create lifecycle policy</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
