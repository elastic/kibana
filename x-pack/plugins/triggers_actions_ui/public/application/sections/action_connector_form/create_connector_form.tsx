/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';

import { EuiTitle, EuiSpacer, EuiErrorBoundary } from '@elastic/eui';
import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';

interface ConnectorFormData {
  name: string;
  [key: string]: unknown;
}

interface CreateConnectorFormProps {
  actionTypeModel: ActionTypeModel | null;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
}

const { emptyField } = fieldValidators;

const nameConfig: FieldConfig<{ name: string }, ConnectorFormData> = {
  label: 'Connector name',
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: 'Name is required.',
          }
        )
      ),
    },
  ],
};

const CreateConnectorFormComponent: React.FC<CreateConnectorFormProps> = ({
  actionTypeModel,
  isEdit,
  registerPreSubmitValidator,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);
  const FieldsComponent = actionTypeModel?.actionConnectorFields ?? null;
  return (
    <>
      <UseField path={'actionTypeId'}>
        {(field) => {
          /**
           * This is a hidden field. We return null so we do not render
           * any field on the form
           */
          return null;
        }}
      </UseField>
      <UseField
        path="name"
        config={nameConfig}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly: !canSave, 'data-test-subj': 'nameInput', fullWidth: true },
        }}
      />
      <EuiSpacer size="m" />
      {FieldsComponent !== null ? (
        <>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.connectorSettingsLabel"
                defaultMessage="Connector settings"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiErrorBoundary>
            <Suspense
              fallback={
                <SectionLoading>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.loadingConnectorSettingsDescription"
                    defaultMessage="Loading connector settings…"
                  />
                </SectionLoading>
              }
            >
              <FieldsComponent
                readOnly={!canSave}
                isEdit={isEdit}
                registerPreSubmitValidator={registerPreSubmitValidator}
              />
            </Suspense>
          </EuiErrorBoundary>
        </>
      ) : null}
    </>
  );
};

export const CreateConnectorForm = memo(CreateConnectorFormComponent);
