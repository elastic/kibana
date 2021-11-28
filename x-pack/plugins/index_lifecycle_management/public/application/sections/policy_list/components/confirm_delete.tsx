/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';

import { PolicyFromES } from '../../../../../common/types';
import { toasts } from '../../../services/notification';
import { showApiError } from '../../../services/api_errors';
import { deletePolicy } from '../../../services/api';

interface Props {
  policyToDelete: PolicyFromES;
  callback: () => void;
  onCancel: () => void;
}
export class ConfirmDelete extends Component<Props> {
  deletePolicy = async () => {
    const { policyToDelete, callback } = this.props;
    const policyName = policyToDelete.name;

    try {
      await deletePolicy(policyName);
      const message = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.successMessage', {
        defaultMessage: 'Deleted policy {policyName}',
        values: { policyName },
      });
      toasts.addSuccess(message);
    } catch (e) {
      const title = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.errorMessage', {
        defaultMessage: 'Error deleting policy {policyName}',
        values: { policyName },
      });
      showApiError(e, title);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { policyToDelete, onCancel } = this.props;
    const title = i18n.translate('xpack.indexLifecycleMgmt.confirmDelete.title', {
      defaultMessage: 'Delete policy "{name}"',
      values: { name: policyToDelete.name },
    });
    return (
      <EuiConfirmModal
        data-test-subj="deletePolicyModal"
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
      >
        <div>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.confirmDelete.undoneWarning"
            defaultMessage="You can't recover a deleted policy."
          />
        </div>
      </EuiConfirmModal>
    );
  }
}
