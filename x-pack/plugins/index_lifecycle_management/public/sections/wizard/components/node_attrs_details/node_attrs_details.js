/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyout,
  EuiTitle,
  EuiInMemoryTable,
  EuiSpacer,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';

export class NodeAttrsDetails extends PureComponent {
  static propTypes = {
    fetchNodeDetails: PropTypes.func.isRequired,
    close: PropTypes.func.isRequired,

    details: PropTypes.array,
    selectedNodeAttrs: PropTypes.string.isRequired,
  };

  componentWillMount() {
    this.props.fetchNodeDetails(this.props.selectedNodeAttrs);
  }

  render() {
    const { selectedNodeAttrs, details, close } = this.props;

    return (
      <EuiFlyout onClose={close}>
        <EuiFlyoutBody>
          <EuiTitle>
            <h2>
              Below is a list of nodes that contain the attribute: `{
                selectedNodeAttrs
              }`
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCallOut
            style={{ marginTop: '1rem' }}
            title="Heads up"
            color="warning"
          >
            Be aware that the nodes listed here only directly match the node
            attribute string and other nodes might be affected by this policy
            due to other allocation rules.
          </EuiCallOut>
          <EuiSpacer size="s" />
          <EuiInMemoryTable
            items={details}
            columns={[
              { field: 'nodeId', name: 'ID' },
              { field: 'stats.name', name: 'Name' },
              { field: 'stats.host', name: 'Host' },
            ]}
            pagination={true}
            sorting={true}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
            Close
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
