/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiSteps } from '@elastic/eui';
import { uniq } from 'lodash';
import { CaseFormFields } from '../case_form_fields';
import * as i18n from './translations';
import type { ActionConnector } from '../../containers/configure/types';
import type { CasesConfigurationUI } from '../../containers/types';
import { TemplateFields } from './template_fields';
import { useCasesFeatures } from '../../common/use_cases_features';
import { SyncAlertsToggle } from '../case_form_fields/sync_alerts_toggle';
import { Connector } from '../case_form_fields/connector';

interface FormFieldsProps {
  isSubmitting?: boolean;
  connectors: ActionConnector[];
  currentConfiguration: CasesConfigurationUI;
  isEditMode?: boolean;
}

const FormFieldsComponent: React.FC<FormFieldsProps> = ({
  isSubmitting = false,
  connectors,
  currentConfiguration,
  isEditMode,
}) => {
  const { isSyncAlertsEnabled } = useCasesFeatures();
  const { customFields: configurationCustomFields, templates } = currentConfiguration;
  const configurationTemplateTags = getTemplateTags(templates);

  const firstStep = useMemo(
    () => ({
      title: i18n.TEMPLATE_FIELDS,
      children: (
        <TemplateFields
          isLoading={isSubmitting}
          configurationTemplateTags={configurationTemplateTags}
        />
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
          setCustomFieldsOptional={true}
          isEditMode={isEditMode}
        />
      ),
    }),
    [isSubmitting, configurationCustomFields, isEditMode]
  );

  const thirdStep = useMemo(
    () => ({
      title: i18n.CASE_SETTINGS,
      children: <SyncAlertsToggle isLoading={isSubmitting} />,
    }),
    [isSubmitting]
  );

  const fourthStep = useMemo(
    () => ({
      title: i18n.CONNECTOR_FIELDS,
      children: (
        <Connector connectors={connectors} isLoading={isSubmitting} isLoadingConnectors={false} />
      ),
    }),
    [connectors, isSubmitting]
  );

  const allSteps = useMemo(
    () => [firstStep, secondStep, ...(isSyncAlertsEnabled ? [thirdStep] : []), fourthStep],
    [firstStep, secondStep, thirdStep, fourthStep, isSyncAlertsEnabled]
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

const getTemplateTags = (templates: CasesConfigurationUI['templates']) =>
  uniq(templates.map((template) => (template?.tags?.length ? template.tags : [])).flat());
