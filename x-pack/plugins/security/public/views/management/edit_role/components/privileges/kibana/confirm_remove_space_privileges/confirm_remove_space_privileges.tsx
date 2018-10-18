/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiConfirmModal, EuiOverlayMask, EuiText } from '@elastic/eui';
import React, { Component } from 'react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export class ConfirmRemoveSpacePrivileges extends Component<Props, {}> {
  public render() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={'Remove access to Kibana?'}
          onCancel={this.props.onCancel}
          onConfirm={this.props.onConfirm}
          cancelButtonText={'Cancel'}
          confirmButtonText={'Remove access'}
        >
          <EuiText>Are you sure you want to remove all access to Kibana for this role?</EuiText>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
