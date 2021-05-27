/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { EuiForm, EuiSpacer, EuiStepsHorizontal, EuiStepStatus } from '@elastic/eui';
import * as i18n from './translations';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SwimlaneActionConnector, SwimlaneFieldMappingConfig } from './types';
import { SwimlaneConnection, SwimlaneFields } from './steps';

const SwimlaneActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SwimlaneActionConnector>
> = ({ errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const stepMap = useMemo<{ [key: number]: any }>(
    () => ({
      1: SwimlaneConnection,
      2: SwimlaneFields,
    }),
    []
  );

  const CurrentStepForm = useMemo(() => {
    return stepMap[currentStep];
  }, [currentStep, stepMap]);
  const [connectionStatus, setConnectionStatus] = useState<EuiStepStatus>('incomplete');
  const [fieldsConfigured, setFieldsConfigured] = useState<EuiStepStatus>('incomplete');

  const [fields, setFields] = useState<SwimlaneFieldMappingConfig[]>([]);

  const updateCurrentStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      if (step === 2) {
        setConnectionStatus('complete');
      } else if (step === 1) {
        setConnectionStatus('incomplete');
        setFieldsConfigured('incomplete');
        editActionConfig('mappings', action.config.mappings);
      }
    },
    [action.config.mappings, editActionConfig]
  );

  const setupSteps = useMemo(
    () => [
      {
        title: i18n.SW_CONFIGURE_CONNECTION_LABEL,
        status: connectionStatus,
        onClick: () => {},
      },
      {
        title: i18n.SW_MAPPING_TITLE_TEXT_FIELD_LABEL,
        disabled: connectionStatus !== 'complete',
        status: fieldsConfigured,
        onClick: () => {},
      },
    ],
    [connectionStatus, fieldsConfigured]
  );

  const editActionConfigCb = useCallback(
    (k: string, v: string) => {
      editActionConfig(k, v);
      if (k === 'mappings' && Object.keys(v).length === 6) {
        setFieldsConfigured('complete');
      } else if (fieldsConfigured === 'complete') {
        setFieldsConfigured('incomplete');
      }
    },
    [editActionConfig, fieldsConfigured]
  );
  return (
    <Fragment>
      <EuiStepsHorizontal steps={setupSteps} />
      <EuiSpacer size="l" />
      <EuiForm>
        <CurrentStepForm
          action={action}
          editActionConfig={editActionConfigCb}
          editActionSecrets={editActionSecrets}
          readOnly={readOnly}
          errors={errors}
          updateCurrentStep={updateCurrentStep}
          updateFields={setFields}
          fields={fields}
        />
      </EuiForm>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
