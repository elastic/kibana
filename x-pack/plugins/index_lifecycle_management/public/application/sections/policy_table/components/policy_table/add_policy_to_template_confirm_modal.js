/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiFieldText,
  EuiSpacer,
  EuiText,
  EuiSwitch,
  EuiButton,
} from '@elastic/eui';

import { addLifecyclePolicyToTemplate, useLoadIndexTemplates } from '../../../../services/api';
import { toasts } from '../../../../services/notification';
import { showApiError } from '../../../../services/api_errors';
import { LearnMoreLink } from '../../../components';

export const AddPolicyToTemplateConfirmModal = ({ policy, onCancel }) => {
  const [isLegacy, setIsLegacy] = useState(false);
  const [templateName, setTemplateName] = useState();
  const [aliasName, setAliasName] = useState();
  const [templateError, setTemplateError] = useState();

  const { error, isLoading, data: templates, sendRequest } = useLoadIndexTemplates(isLegacy);

  const renderTemplateHasPolicyWarning = () => {
    const selectedTemplate = templates.find((template) => template.name === templateName);
    const existingPolicyName = selectedTemplate?.settings?.index?.lifecycle?.name;
    if (!existingPolicyName) {
      return;
    }
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.templateHasPolicyWarningTitle"
              defaultMessage="Template already has policy"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyToTemplateConfirmModal.indexHasNoAliasesWarningMessage"
            defaultMessage="This index template already has the policy {existingPolicyName} attached to it.
            Adding this policy will overwrite that configuration."
            values={{
              existingPolicyName,
            }}
          />
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  };

  const renderUnableToLoadTemplatesCallout = () => {
    const { statusCode = '', message = '' } = error;
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.errorLoadingTemplatesTitle"
              defaultMessage="Unable to load index templates"
            />
          }
          color="danger"
        >
          <p>
            {message} ({statusCode})
          </p>
          <EuiButton isLoading={isLoading} color="danger" onClick={sendRequest}>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.indexManagementTable.addLifecyclePolicyToTemplateConfirmModal.errorLoadingTemplatesButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  };

  const renderAliasFormElement = () => {
    console.log(policy);
    const showAliasTextInput = policy?.policy?.phases.hot?.actions.rollover;
    if (!showAliasTextInput) {
      return null;
    }
    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.rolloverAliasLabel"
            defaultMessage="Alias for rollover index"
          />
        }
      >
        <EuiFieldText
          value={aliasName}
          onChange={(e) => {
            setAliasName(e.target.value);
          }}
        />
      </EuiFormRow>
    );
  };

  const renderForm = () => {
    let options = [];
    if (templates) {
      options = templates.map(({ name }) => {
        return {
          label: name,
        };
      });
    }
    const onComboChange = (comboOptions) => {
      let value = '';
      if (comboOptions.length > 0) {
        value = comboOptions[0].label;
      }
      setTemplateError(undefined);
      setTemplateName(value);
    };
    return (
      <EuiForm>
        <EuiFormRow>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.showLegacyTemplates"
                defaultMessage="Show legacy index templates"
              />
            }
            checked={isLegacy}
            onChange={(e) => {
              setTemplateName('');
              setIsLegacy(e.target.checked);
            }}
          />
        </EuiFormRow>
        {!error ? (
          <>
            {renderTemplateHasPolicyWarning()}
            <EuiFormRow
              isInvalid={!!templateError}
              error={templateError}
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.chooseTemplateLabel"
                  defaultMessage="Index template"
                />
              }
            >
              <EuiComboBox
                isLoading={isLoading}
                placeholder={i18n.translate(
                  'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.chooseTemplateMessage',
                  {
                    defaultMessage: 'Select an index template',
                  }
                )}
                options={options}
                selectedOptions={
                  templateName
                    ? [
                        {
                          label: templateName,
                        },
                      ]
                    : []
                }
                onChange={onComboChange}
                singleSelection={{ asPlainText: true }}
                isClearable={true}
              />
            </EuiFormRow>
          </>
        ) : (
          renderUnableToLoadTemplatesCallout()
        )}
        {renderAliasFormElement()}
      </EuiForm>
    );
  };

  const addPolicyToTemplate = async () => {
    const policyName = policy.name;
    if (!templateName) {
      setTemplateError(
        i18n.translate(
          'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.noTemplateSelectedErrorMessage',
          { defaultMessage: 'You must select an index template.' }
        )
      );
      return;
    }
    try {
      await addLifecyclePolicyToTemplate(
        {
          policyName,
          templateName,
          aliasName,
        },
        isLegacy
      );
      const message = i18n.translate(
        'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.successMessage',
        {
          defaultMessage: 'Added policy {policyName} to index template {templateName}',
          values: { policyName, templateName },
        }
      );
      toasts.addSuccess(message);
      onCancel();
    } catch (e) {
      const title = i18n.translate(
        'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.errorMessage',
        {
          defaultMessage: 'Error adding policy "{policyName}" to index template {templateName}',
          values: { policyName, templateName },
        }
      );
      showApiError(e, title);
    }
  };

  const title = i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.title',
    {
      defaultMessage: 'Add policy "{name}" to index template',
      values: { name: policy.name },
    }
  );

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={addPolicyToTemplate}
        cancelButtonText={i18n.translate(
          'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.cancelButton',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.confirmButton',
          {
            defaultMessage: 'Add policy',
          }
        )}
        confirmButtonDisabled={isLoading || !!error || !templates}
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.addLifecyclePolicyToTemplateConfirmModal.explanationText"
              defaultMessage="This will apply the lifecycle policy to
                  all indices which match the index template."
            />{' '}
            <LearnMoreLink
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
        {renderForm()}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
