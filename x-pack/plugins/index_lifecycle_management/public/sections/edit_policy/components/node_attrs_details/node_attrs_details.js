/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlyoutBody,
  EuiFlyout,
  EuiTitle,
  EuiInMemoryTable,
  EuiSpacer,
  EuiPortal,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';


export class NodeAttrsDetailsUi extends PureComponent {
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
    const { selectedNodeAttrs, details, close, intl } = this.props;

    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={close}>
          <EuiFlyoutBody>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.nodeAttrDetails.title"
                  defaultMessage="Nodes that contain the attribute {selectedNodeAttrs}"
                  values={{ selectedNodeAttrs }}
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
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
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
export const NodeAttrsDetails = injectI18n(NodeAttrsDetailsUi);

