/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { deletePolicy } from '../../../../services/api';
import { showApiError } from '../../../../services/api_errors';
export class ConfirmDeleteUi extends Component {
  deletePolicy = async () => {
    const { intl, policyToDelete, callback } = this.props;
    const policyName = policyToDelete.name;

    try {
      await deletePolicy(policyName);
      const message = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.confirmDelete.successMessage',
        defaultMessage: 'Deleted policy {policyName}',
      }, { policyName });
      toastNotifications.addSuccess(message);
    } catch (e) {
      const title = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.confirmDelete.errorMessage',
        defaultMessage: 'Error deleting policy {policyName}',
      }, { policyName });
      showApiError(e, title);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { intl, policyToDelete, onCancel } = this.props;
    const title = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.confirmDelete.title',
      defaultMessage: 'Delete policy "{name}"',
    }, { name: policyToDelete.name });
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deletePolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.cancelButton"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.deleteButton"
              defaultMessage="Delete"
            />
          }
          buttonColor="danger"
          onClose={onCancel}
        >
          <div>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.undoneWarning"
              defaultMessage="You can't recover a deleted policy."
            />
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
export const ConfirmDelete = injectI18n(ConfirmDeleteUi);
