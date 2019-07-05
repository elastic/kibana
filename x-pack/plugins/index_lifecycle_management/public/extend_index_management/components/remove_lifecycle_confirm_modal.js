/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { removeLifecycleForIndex } from '../../services/api';
import { showApiError } from '../../services/api_errors';
export class RemoveLifecyclePolicyConfirmModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      policies: [],
      selectedPolicyName: null,
      selectedAlias: null,
    };
  }
  oneIndexSelected = () => {
    return this.props.indexNames.length === 1;
  };
  getEntity = oneIndexSelected => {
    return oneIndexSelected ? (
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.indexMessage"
        defaultMessage="index"
      />
    ) : (
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.indicesMessage"
        defaultMessage="indices"
      />
    );
  };
  removePolicy = async () => {
    const { indexNames, httpClient, closeModal, reloadIndices } = this.props;
    const target = this. getTarget();
    try {
      await removeLifecycleForIndex(indexNames, httpClient);
      closeModal();
      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicySuccess',
          {
            defaultMessage: 'Removed lifecycle policy from {target}',
            values: {
              target
            },
          }
        )
      );
      reloadIndices();
    } catch (err) {
      showApiError(
        err,
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicyToIndexError',
          {
            defaultMessage: 'Error removing policy',
          }
        )
      );
    }
  };
  getTarget() {
    const { indexNames } = this.props;
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    return oneIndexSelected ? (indexNames[0]) : `${indexNames.length} ${entity}`;
  }
  render() {

    const { closeModal } = this.props;
    const target = this. getTarget();
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.modalTitle"
              defaultMessage="Remove lifecycle policy from &quot;{target}&quot;"
              values={{
                target
              }}
            />
          }
          onCancel={closeModal}
          onConfirm={this.removePolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.cancelButtonText"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removePolicyButtonText"
              defaultMessage="Remove policy"
            />
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.removeLifecyclePolicyConfirmModal.removeMessage"
            defaultMessage="You are about to remove the index lifecycle policy from &quot;{target}&quot;.
              This operation cannot be undone."
            values={{
              target
            }}
          />
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
