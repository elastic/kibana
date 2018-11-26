/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import {
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiFieldText,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { addLifecyclePolicyToTemplate, loadIndexTemplates } from '../../../../services/api';
import { showApiError } from '../../../../services/api_errors';
export class AddPolicyToTemplateConfirmModalUi extends Component {
  state = {
    templates: []
  }
  async componentDidMount() {
    const templates = await loadIndexTemplates();
    this.setState({ templates });
  }
  addPolicyToTemplate = async () => {
    const { intl, policy, callback, onCancel } = this.props;
    const { templateName, aliasName } = this.state;
    const policyName = policy.name;

    try {
      await addLifecyclePolicyToTemplate({
        policyName,
        templateName,
        aliasName
      });
      const message = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.successMessage',
        defaultMessage: 'Added policy {policyName} to template {templateName}',
      }, { policyName, templateName });
      toastNotifications.addSuccess(message);
      onCancel();
    } catch (e) {
      const title = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.errorMessage',
        defaultMessage: 'Error adding policy {policyName} to template {templateName}',
      }, { policyName, templateName });
      showApiError(e, title);
    }
    if (callback) {
      callback();
    }
  };
  renderForm() {
    const { templates, templateName } = this.state;
    const options = templates.map(({ name }) => {
      return {
        value: name,
        text: name,
      };
    });
    options.unshift({
      value: '',
      text: i18n.translate(
        'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.chooseTemplateMessage',
        {
          defaultMessage: 'Choose an index template',
        }
      ),
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.chooseTemplateLabel"
              defaultMessage="Index template"
            />
          }
        >
          <EuiSelect
            options={options}
            value={templateName}
            onChange={e => {
              this.setState({ templateName: e.target.value });
            }}
          />
        </EuiFormRow>
        {this.renderAliasFormElement()}
      </EuiForm>
    );
  }
  renderAliasFormElement = () => {
    const { aliasName } = this.state;
    const { policy } = this.props;
    const showAliasTextInput =
      policy && get(policy, 'policy.phases.hot.actions.rollover');
    if (!showAliasTextInput) {
      return null;
    }
    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.rolloverAliasLabel"
            defaultMessage="Rollover alias"
          />
        }
      >
        <EuiFieldText
          value={aliasName}
          onChange={e => {
            this.setState({ aliasName: e.target.value });
          }}
        />
      </EuiFormRow>
    );
  };
  render() {
    const { intl, policy, onCancel } = this.props;
    const title = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.title',
      defaultMessage: 'Add policy {name} to template',
    }, { name: policy.name });
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.addPolicyToTemplate}
          cancelButtonText={intl.formatMessage({
            id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.cancelButton',
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={intl.formatMessage({
            id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.confirmButton',
            defaultMessage: 'Add policy',
          })}
          onClose={onCancel}
        >
          {this.renderForm()}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
export const AddPolicyToTemplateConfirmModal = injectI18n(AddPolicyToTemplateConfirmModalUi);
