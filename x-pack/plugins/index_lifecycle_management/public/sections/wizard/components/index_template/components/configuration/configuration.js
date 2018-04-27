/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiSelect,
  EuiFieldNumber,
  EuiHorizontalRule,
  EuiCallOut
} from '@elastic/eui';
import {
  STRUCTURE_NODE_ATTRS,
  STRUCTURE_PRIMARY_NODES,
  STRUCTURE_REPLICAS
} from '../../../../../../store/constants';

import { ErrableFormRow } from '../../../../form_errors';

export class Configuration extends PureComponent {
  static propTypes = {
    fetchNodes: PropTypes.func.isRequired,
    setSelectedNodeAttrs: PropTypes.func.isRequired,
    setSelectedPrimaryShardCount: PropTypes.func.isRequired,
    setSelectedReplicaCount: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    selectedPrimaryShardCount: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    selectedNodeAttrs: PropTypes.string.isRequired,
    nodeOptions: PropTypes.array.isRequired,
    selectedReplicaCount: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    isPrimaryShardCountHigherThanSelectedNodeAttrsCount: PropTypes.bool.isRequired,
  };

  componentWillMount() {
    this.props.fetchNodes();
  }

  render() {
    const {
      setSelectedNodeAttrs,
      setSelectedPrimaryShardCount,
      setSelectedReplicaCount,
      validate,

      nodeOptions,
      selectedPrimaryShardCount,
      selectedReplicaCount,
      selectedNodeAttrs,
      errors,
      isShowingErrors,
      isPrimaryShardCountHigherThanSelectedNodeAttrsCount
    } = this.props;

    const primaryNodeErrors = isPrimaryShardCountHigherThanSelectedNodeAttrsCount ? (
      <EuiCallOut
        style={{ marginTop: '1rem' }}
        title="Proceed with caution!"
        color="warning"
        iconType="help"
      >
        The selected primary shard count is higher than the number of nodes matching the selected attributes.
      </EuiCallOut>
    ) : null;

    return (
      <div>
        <EuiHorizontalRule className="ilmHrule" />
        <EuiTitle>
          <h4>Configure options</h4>
        </EuiTitle>
        <EuiSpacer size="l" />
        <ErrableFormRow
          label="Where do you want your hot indices to live"
          errorKey={STRUCTURE_NODE_ATTRS}
          isShowingErrors={isShowingErrors}
          errors={errors}
        >
          <EuiSelect
            value={selectedNodeAttrs}
            onChange={async e => {
              await setSelectedNodeAttrs(e.target.value);
              validate();
            }}
            options={nodeOptions}
          />
        </ErrableFormRow>
        <EuiSpacer />
        <EuiCallOut
          style={{ marginBottom: '1rem' }}
          title="Note"
        >
          <p>
            Optimize these values for throughput. (Add more)
          </p>
        </EuiCallOut>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem style={{ maxWidth: 188 }}>
            <ErrableFormRow
              label="Primary shards"
              errorKey={STRUCTURE_PRIMARY_NODES}
              isShowingErrors={isShowingErrors}
              errors={errors}
            >
              <EuiFieldNumber
                onChange={async e => {
                  await setSelectedPrimaryShardCount(e.target.value);
                  validate();
                }}
                value={selectedPrimaryShardCount}
              />
            </ErrableFormRow>
          </EuiFlexItem>
          <EuiFlexItem style={{ maxWidth: 188 }}>
            <ErrableFormRow
              label="Replicas"
              errorKey={STRUCTURE_REPLICAS}
              isShowingErrors={isShowingErrors}
              errors={errors}
            >
              <EuiFieldNumber
                onChange={async e => {
                  await setSelectedReplicaCount(e.target.value);
                  validate();
                }}
                value={selectedReplicaCount}
              />
            </ErrableFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {primaryNodeErrors}
      </div>
    );
  }
}
