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
import { CaseFormFields } from '../case_form_fields';
import * as i18n from './translations';
import { Connector } from './connector';
import type { ActionConnector } from '../../containers/configure/types';
import type { CasesConfigurationUI } from '../../containers/types';
import { TemplateFields } from './template_fields';
import { useCasesFeatures } from '../../common/use_cases_features';
import { SyncAlertsToggle } from '../create/sync_alerts_toggle';

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
  const { isSyncAlertsEnabled } = useCasesFeatures();

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
        />
      ),
    }),
    [isSubmitting, configurationCustomFields]
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
