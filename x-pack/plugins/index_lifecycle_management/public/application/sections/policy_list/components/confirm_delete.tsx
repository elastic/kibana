/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiCheckbox, EuiConfirmModal } from '@elastic/eui';

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
  public state = {
    isDeleteConfirmed: false,
  };

  setIsDeleteConfirmed = (confirmed: boolean) => {
    this.setState({
      isDeleteConfirmed: confirmed,
    });
  };

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
  isPolicyPolicy = true;
  render() {
    const { policyToDelete, onCancel } = this.props;
    const { isDeleteConfirmed } = this.state;
    const isManagedPolicy = policyToDelete.policy?._meta?.managed;

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
        confirmButtonDisabled={isManagedPolicy ? !isDeleteConfirmed : false}
      >
        {isManagedPolicy ? (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.deletePolicyModal.proceedWithCautionCallOutTitle"
                defaultMessage="Deleting a managed policy can break Kibana"
              />
            }
            color="danger"
            iconType="alert"
            data-test-subj="deleteManagedPolicyCallOut"
          >
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.deletePolicyModal.proceedWithCautionCallOutDescription"
                defaultMessage="Managed policies are critical for internal operations.
                  If you delete this managed policy, you can’t recover it."
              />
            </p>
            <EuiCheckbox
              id="confirmDeletePolicyCheckbox"
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.deletePolicyModal.confirmDeleteCheckboxLabel"
                  defaultMessage="I understand the consequences of deleting a managed policy"
                />
              }
              checked={isDeleteConfirmed}
              onChange={(e) => this.setIsDeleteConfirmed(e.target.checked)}
            />
          </EuiCallOut>
        ) : (
          <div>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.undoneWarning"
              defaultMessage="You can't recover a deleted policy."
            />
          </div>
        )}
      </EuiConfirmModal>
    );
  }
}
