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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';


export class NodeAttrsDetailsUi extends PureComponent {
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
    const { selectedNodeAttrs, allocationRules, details, close, intl } = this.props;

    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={close}>
          <EuiFlyoutBody>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.nodeAttrDetails.title"
                  defaultMessage="Nodes that contain the attribute: {selectedNodeAttrs}"
                  values={{ selectedNodeAttrs }}
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            {allocationRules ? (
              <Fragment>
                <EuiCallOut
                  style={{ marginTop: '1rem' }}
                  title="Heads up"
                  color="warning"
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.nodeAttrDetails.existingAllocationRulesWarning"
                    defaultMessage="Be aware that this index template has existing allocation rules which will affect the list of nodes these indices can be allocated to." //eslint-disable-line max-len
                  />
                </EuiCallOut>
                <EuiSpacer size="s" />
              </Fragment>
            ) : null}
            <EuiInMemoryTable
              items={details}
              columns={[
                { field: 'nodeId', name: intl.formatMessage({
                  id: 'xpack.indexLifecycleMgmt.nodeAttrDetails.idField',
                  defaultMessage: 'ID',
                }) },
                { field: 'stats.name', name: intl.formatMessage({
                  id: 'xpack.indexLifecycleMgmt.nodeAttrDetails.nameField',
                  defaultMessage: 'Name',
                }) },
                { field: 'stats.host', name: intl.formatMessage({
                  id: 'xpack.indexLifecycleMgmt.nodeAttrDetails.hostField',
                  defaultMessage: 'Host',
                }) },
              ]}
              pagination={true}
              sorting={true}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.nodeAttrDetails.closeLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
export const NodeAttrsDetails = injectI18n(NodeAttrsDetailsUi);

