/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ApplicationStart } from '@kbn/core/public';

import {
  EuiLink,
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiConfirmModal,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiCallOut,
  EuiSpacer,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { loadPolicies, addLifecyclePolicyToIndex } from '../../application/services/api';
import { showApiError } from '../../application/services/api_errors';
import { toasts } from '../../application/services/notification';
import { Index, PolicyFromES } from '../../../common/types';

interface Props {
  indexName: string;
  closeModal: () => void;
  index: Index;
  reloadIndices: () => void;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

interface State {
  selectedPolicyName: string;
  selectedAlias: string;
  policies: PolicyFromES[];
  policyErrorMessage?: string;
}

export class AddLifecyclePolicyConfirmModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      policies: [],
      selectedPolicyName: '',
      selectedAlias: '',
    };
  }
  addPolicy = async () => {
    const { indexName, closeModal, reloadIndices } = this.props;
    const { selectedPolicyName, selectedAlias } = this.state;
    if (!selectedPolicyName) {
      this.setState({
        policyErrorMessage: i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.noPolicySelectedErrorMessage',
          { defaultMessage: 'You must select a policy.' }
        ),
      });
      return;
    }
    try {
      const body = {
        indexName,
        policyName: selectedPolicyName,
        alias: selectedAlias,
      };
      await addLifecyclePolicyToIndex(body);
      closeModal();
      toasts.addSuccess(
        i18n.translate(
          'xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.addPolicyToIndexSuccess',
          {
            defaultMessage: 'Added policy {policyName} to index {indexName}.',
            values: {
              policyName: selectedPolicyName,
              indexName,
            },
          }
        )
      );
      reloadIndices();
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
  renderAliasFormElement = (selectedPolicy?: PolicyFromES) => {
    const { selectedAlias } = this.state;
    const { index } = this.props;
    const showAliasSelect =
      selectedPolicy && get(selectedPolicy, 'policy.phases.hot.actions.rollover');
    if (!showAliasSelect) {
      return null;
    }
    const { aliases } = index;
    if (aliases === 'none') {
      return (
        <Fragment>
          <EuiSpacer size="m" />
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
                policyName: selectedPolicy?.name,
                indexName: index.name,
              }}
            />
          </EuiCallOut>
        </Fragment>
      );
    }
    const aliasOptions = (aliases as string[]).map((alias: string) => {
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
            defaultMessage="Index rollover alias"
          />
        }
      >
        <EuiSelect
          options={aliasOptions}
          value={selectedAlias}
          onChange={(e) => {
            this.setState({ selectedAlias: e.target.value });
          }}
        />
      </EuiFormRow>
    );
  };
  renderForm() {
    const { policies, selectedPolicyName, policyErrorMessage } = this.state;
    const selectedPolicy = selectedPolicyName
      ? policies.find((policy) => policy.name === selectedPolicyName)
      : undefined;

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
          defaultMessage: 'Select a lifecycle policy',
        }
      ),
    });
    return (
      <EuiForm>
        <EuiFormRow
          isInvalid={!!policyErrorMessage}
          error={policyErrorMessage}
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
            onChange={(e) => {
              this.setState({ policyErrorMessage: undefined, selectedPolicyName: e.target.value });
            }}
          />
        </EuiFormRow>
        {this.renderAliasFormElement(selectedPolicy)}
      </EuiForm>
    );
  }
  async componentDidMount() {
    try {
      const policies = await loadPolicies();
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
    const { policies } = this.state;
    const { indexName, closeModal, getUrlForApp } = this.props;
    const title = (
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.modalTitle"
        defaultMessage='Add lifecycle policy to "{indexName}"'
        values={{
          indexName,
        }}
      />
    );
    if (!policies.length) {
      return (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
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
              <p>
                <EuiLink
                  href={getUrlForApp('management', {
                    path: `data/index_lifecycle_management/policies/edit`,
                  })}
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.defineLifecyclePolicyLinkText"
                    defaultMessage="Define lifecycle policy"
                  />
                </EuiLink>
              </p>
            </EuiCallOut>
          </EuiModalBody>
        </EuiModal>
      );
    }
    return (
      <EuiConfirmModal
        title={title}
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
    );
  }
}
