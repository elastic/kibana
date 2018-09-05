/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { deletePolicies } from '../../../../api';
export class ConfirmDelete extends Component {
  deletePolicies = async () => {
    const { policiesToDelete, callback } = this.props;
    const policyNames = policiesToDelete.map(policy => {
      return policy.name;
    });

    try {
      await deletePolicies(policyNames);
      toastNotifications.addSuccess(`Deleted policies ${policyNames.join(', ')}`);
    } catch (e) {
      toastNotifications.addDanger(`Error deleting policies ${policyNames.join(', ')}`);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { policiesToDelete, onCancel } = this.props;
    const moreThanOne = policiesToDelete.length > 1;
    const title = moreThanOne
      ? `Delete ${policiesToDelete.length} policies`
      : `Delete policy '${policiesToDelete[0].name}'`;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deletePolicies}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          onClose={() => {}}
        >
          <div>
            <Fragment>
              <p>
                You are about to delete {moreThanOne ? 'these' : 'this'} polic
                {moreThanOne ? 'ies' : 'y'}:
              </p>
              <ul>
                {policiesToDelete.map(
                  (({ name, coveredIndices }) => (
                    <li key={name}>
                      {name} {coveredIndices ? `: ${coveredIndices.join(',')}` : null}
                    </li>
                  ): null)
                )}
              </ul>
            </Fragment>
            <p>This operation cannot be undone.</p>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
