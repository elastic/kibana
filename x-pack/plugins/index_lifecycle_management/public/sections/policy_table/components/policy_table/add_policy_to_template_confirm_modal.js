/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { get, find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { LearnMoreLink } from '../../../components/learn_more_link';
import {
  EuiCallOut,
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiFieldText,
  EuiSpacer,
  EuiText,
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
    if (!templateName) {
      this.setState({ templateError: i18n.translate(
        'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.noTemplateSelectedErrorMessage',
        { defaultMessage: 'You must select an index template.' }) });
      return;
    }
    try {
      await addLifecyclePolicyToTemplate({
        policyName,
        templateName,
        aliasName
      });
      const message = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.successMessage',
        defaultMessage: 'Added policy {policyName} to index template {templateName}',
      }, { policyName, templateName });
      toastNotifications.addSuccess(message);
      onCancel();
    } catch (e) {
      const title = intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.errorMessage',
        defaultMessage: 'Error adding policy "{policyName}" to index template {templateName}',
      }, { policyName, templateName });
      showApiError(e, title);
    }
    if (callback) {
      callback();
    }
  };
  renderTemplateHasPolicyWarning() {
    const selectedTemplate = this.getSelectedTemplate();
    const existingPolicyName = get(selectedTemplate, 'settings.index.lifecycle.name');
    if (!existingPolicyName) {
      return;
    }
    return (
      <Fragment>
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.templateHasPolicyWarningTitle"
              defaultMessage="Template already has policy"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyConfirmModal.indexHasNoAliasesWarningMessage"
            defaultMessage="This index template already has the policy {existingPolicyName} attached to it.
            Adding this policy will overwrite that configuration."
            values={{
              existingPolicyName
            }}
          />
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  getSelectedTemplate() {
    const { templates, templateName } = this.state;
    return find(templates, template => template.name === templateName);
  }
  renderForm() {
    const { templates, templateName, templateError } = this.state;
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
          defaultMessage: 'Select an index template',
        }
      ),
    });
    return (
      <EuiForm>
        {this.renderTemplateHasPolicyWarning()}
        <EuiFormRow
          isInvalid={!!templateError}
          error={templateError}
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
              this.setState({ templateError: null, templateName: e.target.value });
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
            defaultMessage="Alias for rollover index"
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
      defaultMessage: 'Add policy "{name}" to index template',
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
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyConfirmModal.explanationText"
                defaultMessage="This will apply the lifecycle policy to
                  all indices which match the index template."
              />{' '}<LearnMoreLink
                docPath="indices-templates.html"
                text={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.learnAboutIndexTemplatesLink"
                    defaultMessage="Learn about index templates"
                  />
                }
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {this.renderForm()}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
export const AddPolicyToTemplateConfirmModal = injectI18n(AddPolicyToTemplateConfirmModalUi);
