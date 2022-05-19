/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { EuiForm, EuiSpacer, EuiStepsHorizontal, EuiButton, EuiFormRow } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnectorFieldsProps } from '../../../../types';
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
  }, [apiToken, apiUrl, appId, getApplication]);

  const resetConnection = useCallback(() => {
    setCurrentStep(1);
  }, []);

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
        // disabled: hasConfigurationErrors || isLoadingApplication,
        isSelected: currentStep === 2,
        onClick: onNextStep,
        // status: hasMappingErrors ? ('danger' as EuiStepStatus) : undefined,
      },
    ],
    [currentStep, onNextStep, updateCurrentStep]
  );

  /**
   * Connector type needs to be updated on mount to All.
   * Otherwise it is undefined and this will cause an error
   * if the user saves the connector without going to the
   * second step.  Same for mapping.
   */
  // useEffect(() => {
  //   editActionConfig('connectorType', connectorType ?? SwimlaneConnectorType.All);
  //   editActionConfig('mappings', mappings ?? {});
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

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
          <SwimlaneFields updateCurrentStep={updateCurrentStep} fields={fields} />
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
