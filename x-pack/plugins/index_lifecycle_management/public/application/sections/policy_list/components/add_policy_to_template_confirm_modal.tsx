/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiConfirmModal,
  EuiFieldText,
  EuiSpacer,
  EuiText,
  EuiSwitch,
  EuiButton,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { PolicyFromES } from '../../../../../common/types';
import { addLifecyclePolicyToTemplate, useLoadIndexTemplates } from '../../../services/api';
import { toasts } from '../../../services/notification';
import { showApiError } from '../../../services/api_errors';
import { LearnMoreLink } from '../../edit_policy/components';
import { useKibana } from '../../../../shared_imports';

interface Props {
  policy: PolicyFromES;
  onSuccess: (indexTemplate: string) => void;
  onCancel: () => void;
}

export const AddPolicyToTemplateConfirmModal: React.FunctionComponent<Props> = ({
  policy,
  onSuccess,
  onCancel,
}) => {
  const [isLegacy, setIsLegacy] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [aliasName, setAliasName] = useState<string>('');
  const [templateError, setTemplateError] = useState<string>('');

  const { error, isLoading, data: templates, resendRequest } = useLoadIndexTemplates(isLegacy);

  const renderTemplateHasPolicyWarning = () => {
    const selectedTemplate = templates!.find((template) => template.name === templateName);
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
    const { statusCode = '', message = '' } = error!;
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
          <EuiButton isLoading={isLoading} color="danger" onClick={resendRequest}>
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
    const showAliasTextInput = policy.policy.phases.hot?.actions.rollover;
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
    let options: EuiComboBoxOptionOption[] = [];
    if (templates) {
      options = templates.map(({ name }) => {
        return {
          label: name,
        };
      });
    }
    const onComboChange = (comboOptions: EuiComboBoxOptionOption[]) => {
      setTemplateError('');
      setTemplateName(comboOptions.length > 0 ? comboOptions[0].label : '');
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
        {error ? (
          renderUnableToLoadTemplatesCallout()
        ) : (
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
          aliasName: aliasName === '' ? undefined : aliasName,
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
      onSuccess(templateName);
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

  const { docLinks } = useKibana().services;

  return (
    <EuiConfirmModal
      data-test-subj="addPolicyToTemplateModal"
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
            docPath={docLinks.links.elasticsearch.indexTemplates}
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
  );
};
