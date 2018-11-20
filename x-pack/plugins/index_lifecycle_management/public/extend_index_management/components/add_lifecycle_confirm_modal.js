/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
} from '@elastic/eui';
import { BASE_PATH } from '../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { loadPolicies, addLifecyclePolicyToIndex } from '../../services/api';
import { showApiError } from '../../services/api_errors';
export class AddLifecyclePolicyConfirmModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      policies: [],
      selectedPolicyName: null,
      selectedAlias: null,
    };
  }
  addPolicy = async () => {
    const { indexName, httpClient, closeModal } = this.props;
    const { selectedPolicyName, selectedAlias } = this.state;
    if (!selectedPolicyName) {
      return;
    }
    try {
      const body = {
        indexName,
        policyName: selectedPolicyName,
        alias: selectedAlias,
      };
      await addLifecyclePolicyToIndex(body, httpClient);
      closeModal();
      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.addPolicyToIndexSuccess',
          {
            defaultMessage: 'Added policy {policyName} to index {indexName}',
            values: {
              policyName: selectedPolicyName,
              indexName,
            },
          }
        )
      );
    } catch (err) {
      showApiError(
        err,
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.addPolicyToIndexError',
          {
            defaultMessage: 'Error adding policy to index',
          }
        )
      );
    }
  };
  renderAliasFormElement = (selectedPolicy) => {
    const { selectedAlias } = this.state;
    const { index } = this.props;
    const showAliasSelect = selectedPolicy && get(selectedPolicy, 'policy.phases.hot.actions.rollover');
    if (!showAliasSelect) {
      return null;
    }
    const { aliases } = index;
    if (aliases === 'none') {
      return (
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.indexHasNoAliasesWarningTitle"
              defaultMessage="Index has no aliases"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.indexHasNoAliasesWarningMessage"
            defaultMessage="Policy {policyName} is configured for rollover,
             but index {indexName} does not have an alias, which is required for rollover."
            values={{
              policyName: selectedPolicy.name,
              indexName: index.name
            }}
          />
        </EuiCallOut>
      );
    }
    const aliasOptions = aliases.map(alias => {
      return {
        text: alias,
        value: alias,
      };
    });
    aliasOptions.unshift({
      text: i18n.translate(
        'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.chooseAliasMessage',
        {
          defaultMessage: 'Choose an alias',
        }
      ),
      value: '',
    });
    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.chooseAliasLabel"
            defaultMessage="Index alias"
          />
        }
      >
        <EuiSelect
          options={aliasOptions}
          value={selectedAlias}
          onChange={e => {
            this.setState({ selectedAlias: e.target.value });
          }}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFormRow>
    );
  }
  renderForm() {
    const { policies, selectedPolicyName } = this.state;
    const selectedPolicy = selectedPolicyName
      ? policies.find(policy => policy.name === selectedPolicyName)
      : null;

    if (!policies.length) {
      return (
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.noPoliciesWarningTitle"
              defaultMessage="No index lifecycle policies defined"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.noPoliciesWarningMessage"
            defaultMessage="No index lifecycle policies are defined."
          />
          <p>
            <EuiLink
              href={`#${BASE_PATH}policies/edit`}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.defineLifecyclePolicyLinkText"
                defaultMessage="Define lifecycle policy"
              />
            </EuiLink>
          </p>
        </EuiCallOut>
      );
    }
    const options = policies.map(({ name }) => {
      return {
        value: name,
        text: name,
      };
    });
    options.unshift({
      value: '',
      text: i18n.translate(
        'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.choosePolicyMessage',
        {
          defaultMessage: 'Choose a lifecycle policy',
        }
      ),
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.choosePolicyLabel"
              defaultMessage="Lifecycle policy"
            />
          }
        >
          <EuiSelect
            options={options}
            value={selectedPolicyName}
            onChange={e => {
              this.setState({ selectedPolicyName: e.target.value });
            }}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
        {this.renderAliasFormElement(selectedPolicy)}
      </EuiForm>
    );
  }
  async componentDidMount() {
    try {
      const policies = await loadPolicies(false, this.props.httpClient);
      this.setState({ policies });
    } catch (err) {
      showApiError(
        err,
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.loadPolicyError',
          {
            defaultMessage: 'Error loading policy list',
          }
        )
      );
      this.props.closeModal();
    }
  }
  render() {
    const { indexName, closeModal } = this.props;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.modalTitle"
              defaultMessage="Add lifecycle policy to {indexName}"
              values={{
                indexName
              }}
            />
          }
          onCancel={closeModal}
          onConfirm={this.addPolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.cancelButtonText"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.addPolicyButtonText"
              defaultMessage="Add policy"
            />
          }
        >
          {this.renderForm()}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
