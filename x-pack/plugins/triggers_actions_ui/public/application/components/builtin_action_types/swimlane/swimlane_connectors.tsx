/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { EuiForm, EuiSpacer, EuiStepsHorizontal, EuiStepStatus } from '@elastic/eui';
import * as i18n from './translations';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SwimlaneActionConnector, SwimlaneFieldMappingConfig } from './types';
import { SwimlaneConnection, SwimlaneFields } from './steps';

const SwimlaneActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SwimlaneActionConnector>
> = ({ errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const stepMap: { [key: number]: any } = {
    1: SwimlaneConnection,
    2: SwimlaneFields,
  };
  const CurrentStepForm = stepMap[currentStep];
  const [connectionStatus] = useState('incomplete' as EuiStepStatus);
  const [fieldsConfigured] = useState('incomplete' as EuiStepStatus);

  const [fields, setFields] = useState(new Array<SwimlaneFieldMappingConfig>());

  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
  };

  const updateFields = (items: SwimlaneFieldMappingConfig[]) => {
    setFields(items);
  };

  const setupSteps = [
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
  ];

  return (
    <Fragment>
      <EuiStepsHorizontal steps={setupSteps} />
      <EuiSpacer size="l" />
      <EuiForm>
        <CurrentStepForm
          action={action}
          editActionConfig={editActionConfig}
          editActionSecrets={editActionSecrets}
          readOnly={readOnly}
          errors={errors}
          updateCurrentStep={updateCurrentStep}
          updateFields={updateFields}
          fields={fields}
        />
      </EuiForm>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
