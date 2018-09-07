/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { deletePolicies } from '../../../../api';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
export class ConfirmDeleteUi extends Component {
  deletePolicies = async () => {
    const { intl } = this.props;
    const { policiesToDelete, callback } = this.props;
    const policyNames = policiesToDelete.map(policy => {
      return policy.name;
    });

    try {
      await deletePolicies(policyNames);
      const message = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.confirmDelete.successMessage',
        defaultMessage: 'Deleted {numPolicies, plural, one {policy} other {policies}} {policies}',
      }, { numPolicies: policiesToDelete.length, policies: policyNames.join(', ') });
      toastNotifications.addSuccess(message);
    } catch (e) {
      const message = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.confirmDelete.errorMessage',
        defaultMessage: 'Error deleting {numPolicies, plural, one {policy} other {policies}} {policies}',
      }, { numPolicies: policiesToDelete.length, policies: policyNames.join(', ') });
      toastNotifications.addDanger(message);
    }
    if (callback) {
      callback();
    }
  };
  render() {
    const { intl } = this.props;
    const { policiesToDelete, onCancel } = this.props;
    const numPolicies = policiesToDelete.length;
    const title = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.confirmDelete.title',
      defaultMessage: 'Delete {numPolicies, plural, one {{name}} other {# policies}}',
    }, { numPolicies, name: policiesToDelete[0].name });
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
                {intl.formatMessage({
                  id: 'xpack.indexLifecycleMgmt.confirmDelete.deleteSummary',
                  defaultMessage: 'You are about to delete {numPolicies, plural, one {this} other {these}} {numPolicies, plural, one {policy} other {policies}}:', // eslint-disable-line max-len
                }, { numPolicies })}
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
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.confirmDelete.undoneWarning"
              defaultMessage="This operation cannot be undone."
            />
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
export const ConfirmDelete = injectI18n(ConfirmDeleteUi);
