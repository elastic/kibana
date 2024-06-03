/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  TextField,
  HiddenField,
  TextAreaField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiSteps } from '@elastic/eui';
import { CaseFormFields } from '../case_form_fields';
import * as i18n from './translations';
import { Connector } from './connector';
import type { ActionConnector } from '../../containers/configure/types';
import type { CasesConfigurationUI } from '../../containers/types';
import { OptionalFieldLabel } from '../create/optional_field_label';
import { TemplateTags } from './template_tags';

interface FormFieldsProps {
  isSubmitting?: boolean;
  connectors: ActionConnector[];
  configurationConnectorId: string;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  configurationTemplateTags: string[];
}

const FormFieldsComponent: React.FC<FormFieldsProps> = ({
  isSubmitting = false,
  connectors,
  configurationConnectorId,
  configurationCustomFields,
  configurationTemplateTags,
}) => {
  const firstStep = useMemo(
    () => ({
      title: i18n.TEMPLATE_FIELDS,
      children: (
        <>
          <UseField
            path="name"
            component={TextField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'template-name-input',
                fullWidth: true,
                autoFocus: true,
                isLoading: isSubmitting,
              },
            }}
          />
          <TemplateTags isLoading={isSubmitting} tags={configurationTemplateTags} />
          <UseField
            path="templateDescription"
            component={TextAreaField}
            componentProps={{
              labelAppend: OptionalFieldLabel,
              euiFieldProps: {
                'data-test-subj': 'template-description-input',
                fullWidth: true,
                isLoading: isSubmitting,
              },
            }}
          />
        </>
      ),
    }),
    [isSubmitting, configurationTemplateTags]
  );

  const secondStep = useMemo(
    () => ({
      title: i18n.CASE_FIELDS,
      children: (
        <CaseFormFields
          configurationCustomFields={configurationCustomFields}
          isLoading={isSubmitting}
        />
      ),
    }),
    [isSubmitting, configurationCustomFields]
  );

  const thirdStep = useMemo(
    () => ({
      title: i18n.CONNECTOR_FIELDS,
      children: (
        <div>
          <Connector
            connectors={connectors}
            isLoading={isSubmitting}
            configurationConnectorId={configurationConnectorId}
          />
        </div>
      ),
    }),
    [connectors, configurationConnectorId, isSubmitting]
  );

  const allSteps = useMemo(
    () => [firstStep, secondStep, thirdStep],
    [firstStep, secondStep, thirdStep]
  );

  return (
    <>
      <UseField path="key" component={HiddenField} />

      <EuiSteps
        headingElement="h2"
        steps={allSteps}
        data-test-subj={'template-creation-form-steps'}
      />
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
