/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { deletePolicy } from '../../../../api';
export class ConfirmDelete extends Component {
  deletePolicy = async () => {
    const { policyToDelete, callback } = this.props;
    const policyName = policyToDelete.name;

    try {
      await deletePolicy(policyName);
      toastNotifications.addSuccess(`Deleted policy ${policyName}`);
    } catch (e) {
      toastNotifications.addDanger(`Error deleting policy ${policyName}`);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { policyToDelete, onCancel } = this.props;
    const title = `Delete policy '${policyToDelete.name}'`;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deletePolicy}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          onClose={() => {}}
        >
          <div>
            <p>This operation cannot be undone.</p>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
