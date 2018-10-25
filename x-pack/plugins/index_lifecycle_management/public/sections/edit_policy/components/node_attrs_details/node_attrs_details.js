/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
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
  EuiPortal,
} from '@elastic/eui';

export class NodeAttrsDetails extends PureComponent {
  static propTypes = {
    fetchNodeDetails: PropTypes.func.isRequired,
    close: PropTypes.func.isRequired,

    details: PropTypes.array,
    selectedNodeAttrs: PropTypes.string.isRequired,
    allocationRules: PropTypes.object,
  };

  componentWillMount() {
    this.props.fetchNodeDetails(this.props.selectedNodeAttrs);
  }

  render() {
    const { selectedNodeAttrs, allocationRules, details, close } = this.props;

    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={close}>
          <EuiFlyoutBody>
            <EuiTitle>
              <h2>Nodes that contain the attribute: `{selectedNodeAttrs}`</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            {allocationRules ? (
              <Fragment>
                <EuiCallOut
                  style={{ marginTop: '1rem' }}
                  title="Heads up"
                  color="warning"
                >
                  Be aware that this index template has existing allocation rules
                  which will affect the list of nodes these indices can be allocated to.
                </EuiCallOut>
                <EuiSpacer size="s" />
              </Fragment>
            ) : null}
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
      </EuiPortal>
    );
  }
}
