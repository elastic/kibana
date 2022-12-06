/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import {
  EuiForm,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiButton,
  EuiFormRow,
  EuiStepStatus,
} from '@elastic/eui';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { SwimlaneFieldMappingConfig } from './types';
import { SwimlaneConnection, SwimlaneFields } from './steps';
import { useGetApplication } from './use_get_application';
import * as i18n from './translations';

const SwimlaneActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [hasConfigurationErrors, setHasConfigurationError] = useState(false);
  const { isValid, validateFields } = useFormContext();
  const [{ config, secrets }] = useFormData({
    watch: ['config.apiUrl', 'config.appId', 'secrets.apiToken'],
  });
  const { getApplication, isLoading: isLoadingApplication } = useGetApplication({
    toastNotifications: toasts,
  });

  const apiUrl = config?.apiUrl ?? '';
  const appId = config?.appId ?? '';
  const apiToken = secrets?.apiToken ?? '';
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fields, setFields] = useState<SwimlaneFieldMappingConfig[]>([]);

  const updateCurrentStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const onNextStep = useCallback(async () => {
    setHasConfigurationError(false);

    const { areFieldsValid } = await validateFields([
      'config.apiUrl',
      'config.appId',
      'secrets.apiToken',
    ]);

    if (!areFieldsValid) {
      setHasConfigurationError(true);
      return;
    }

    // fetch swimlane application configuration
    const application = await getApplication({
      apiUrl,
      appId,
      apiToken,
    });

    if (application?.fields) {
      const allFields = application.fields;
      setFields(allFields);
      setCurrentStep(2);
    }
  }, [apiToken, apiUrl, appId, getApplication, validateFields]);

  const resetConnection = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const steps = useMemo(
    () => [
      {
        title: i18n.SW_CONFIGURE_CONNECTION_LABEL,
        isSelected: currentStep === 1,
        status: (currentStep === 1
          ? 'selected'
          : currentStep === 2
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => updateCurrentStep(1),
      },
      {
        title: i18n.SW_MAPPING_TITLE_TEXT_FIELD_LABEL,
        disabled: hasConfigurationErrors || isLoadingApplication,
        onClick: onNextStep,
        status: (!isValid
          ? 'danger'
          : currentStep === 2
          ? 'selected'
          : 'incomplete') as EuiStepStatus,
      },
    ],
    [
      currentStep,
      hasConfigurationErrors,
      isLoadingApplication,
      isValid,
      onNextStep,
      updateCurrentStep,
    ]
  );

  return (
    <Fragment>
      <EuiStepsHorizontal steps={steps} />
      <EuiSpacer size="l" />
      <EuiForm>
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <SwimlaneConnection readOnly={readOnly} />
          <EuiSpacer />
          <EuiFormRow fullWidth helpText={i18n.SW_FIELDS_BUTTON_HELP_TEXT}>
            <EuiButton
              // disabled={hasConfigurationErrors || isLoadingApplication}
              isLoading={isLoadingApplication}
              onClick={onNextStep}
              data-test-subj="swimlaneConfigureMapping"
              iconType="arrowRight"
              iconSide="right"
            >
              {i18n.SW_NEXT}
            </EuiButton>
          </EuiFormRow>
        </div>
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <SwimlaneFields fields={fields} readOnly={readOnly} />
          <EuiButton onClick={resetConnection} iconType="arrowLeft">
            {i18n.SW_BACK}
          </EuiButton>
        </div>
      </EuiForm>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
