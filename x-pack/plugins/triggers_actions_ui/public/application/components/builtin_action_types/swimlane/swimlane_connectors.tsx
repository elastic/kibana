/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState, useEffect } from 'react';
import {
  EuiForm,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiStepStatus,
  EuiButton,
  EuiFormRow,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnectorFieldsProps } from '../../../../types';
import {
  SwimlaneActionConnector,
  SwimlaneConnectorType,
  SwimlaneFieldMappingConfig,
} from './types';
import { SwimlaneConnection, SwimlaneFields } from './steps';
import { useGetApplication } from './use_get_application';
import * as i18n from './translations';

const SwimlaneActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SwimlaneActionConnector>
> = ({ errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { apiUrl, appId, mappings, connectorType } = action.config;
  const { apiToken } = action.secrets;

  const { getApplication, isLoading: isLoadingApplication } = useGetApplication({
    toastNotifications: toasts,
    apiToken,
    appId,
    apiUrl,
  });

  const hasConfigurationErrors =
    errors.apiUrl?.length > 0 || errors.appId?.length > 0 || errors.apiToken?.length > 0;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fields, setFields] = useState<SwimlaneFieldMappingConfig[]>([]);

  const updateCurrentStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const onNextStep = useCallback(async () => {
    // fetch swimlane application configuration
    const application = await getApplication();

    if (application?.fields) {
      const allFields = application.fields;
      setFields(allFields);
      setCurrentStep(2);
    }
  }, [getApplication]);

  const resetConnection = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const hasMappingErrors = useMemo(
    () => Object.values(errors?.mappings ?? {}).some((mappingError) => mappingError.length !== 0),
    [errors?.mappings]
  );

  const steps = useMemo(
    () => [
      {
        title: i18n.SW_CONFIGURE_CONNECTION_LABEL,
        isSelected: currentStep === 1,
        isComplete: currentStep === 2,
        onClick: () => updateCurrentStep(1),
      },
      {
        title: i18n.SW_MAPPING_TITLE_TEXT_FIELD_LABEL,
        disabled: hasConfigurationErrors || isLoadingApplication,
        isSelected: currentStep === 2,
        onClick: onNextStep,
        status: hasMappingErrors ? ('danger' as EuiStepStatus) : undefined,
      },
    ],
    [
      currentStep,
      hasConfigurationErrors,
      hasMappingErrors,
      isLoadingApplication,
      onNextStep,
      updateCurrentStep,
    ]
  );

  /**
   * Connector type needs to be updated on mount to All.
   * Otherwise it is undefined and this will cause an error
   * if the user saves the connector without going to the
   * second step.  Same for mapping.
   */
  useEffect(() => {
    editActionConfig('connectorType', connectorType ?? SwimlaneConnectorType.All);
    editActionConfig('mappings', mappings ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiStepsHorizontal steps={steps} />
      <EuiSpacer size="l" />
      <EuiForm>
        {currentStep === 1 && (
          <>
            <SwimlaneConnection
              action={action}
              editActionConfig={editActionConfig}
              editActionSecrets={editActionSecrets}
              readOnly={readOnly}
              errors={errors}
            />
            <EuiSpacer />
            <EuiFormRow fullWidth helpText={i18n.SW_FIELDS_BUTTON_HELP_TEXT}>
              <EuiButton
                disabled={hasConfigurationErrors || isLoadingApplication}
                isLoading={isLoadingApplication}
                onClick={onNextStep}
                data-test-subj="swimlaneConfigureMapping"
                iconType="arrowRight"
                iconSide="right"
              >
                {i18n.SW_NEXT}
              </EuiButton>
            </EuiFormRow>
          </>
        )}
        {currentStep === 2 && (
          <>
            <SwimlaneFields
              action={action}
              editActionConfig={editActionConfig}
              updateCurrentStep={updateCurrentStep}
              fields={fields}
              errors={errors}
            />
            <EuiButton onClick={resetConnection} iconType="arrowLeft">
              {i18n.SW_BACK}
            </EuiButton>
          </>
        )}
      </EuiForm>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
