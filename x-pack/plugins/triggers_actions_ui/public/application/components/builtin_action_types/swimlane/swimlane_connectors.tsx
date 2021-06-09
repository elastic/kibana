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
  const [stepsStatuses, setStepsStatuses] = useState<{
    connection: EuiStepStatus;
    fields: EuiStepStatus;
  }>({ connection: 'incomplete', fields: 'incomplete' });
  const [fields, setFields] = useState<SwimlaneFieldMappingConfig[]>([]);

  const updateCurrentStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      if (step === 2) {
        setStepsStatuses((statuses) => ({ ...statuses, connection: 'complete' }));
      } else if (step === 1) {
        setStepsStatuses({
          fields: 'incomplete',
          connection: 'incomplete',
        });
        editActionConfig('mappings', action.config.mappings);
      }
    },
    [action.config.mappings, editActionConfig]
  );

  const setupSteps = useMemo(
    () => [
      {
        title: i18n.SW_CONFIGURE_CONNECTION_LABEL,
        status: stepsStatuses.connection,
        onClick: () => updateCurrentStep(1),
      },
      {
        title: i18n.SW_MAPPING_TITLE_TEXT_FIELD_LABEL,
        disabled: stepsStatuses.connection !== 'complete',
        status: stepsStatuses.fields,
        onClick: () => updateCurrentStep(2),
      },
    ],
    [stepsStatuses.connection, stepsStatuses.fields, updateCurrentStep]
  );

  const editActionConfigCb = useCallback(
    (k: string, v: string) => {
      editActionConfig(k, v);
      if (
        Object.values(errors?.mappings ?? {}).every((mappingError) => mappingError.length === 0)
      ) {
        setStepsStatuses((statuses) => ({ ...statuses, fields: 'complete' }));
      } else {
        setStepsStatuses((statuses) => ({ ...statuses, fields: 'incomplete' }));
      }
    },
    [editActionConfig, errors?.mappings]
  );
  return (
    <Fragment>
      <EuiStepsHorizontal steps={setupSteps} />
      <EuiSpacer size="l" />
      <EuiForm>
        {currentStep === 1 && (
          <SwimlaneConnection
            action={action}
            editActionConfig={editActionConfigCb}
            editActionSecrets={editActionSecrets}
            readOnly={readOnly}
            errors={errors}
            updateCurrentStep={updateCurrentStep}
            updateFields={setFields}
          />
        )}
        {currentStep === 2 && (
          <SwimlaneFields
            action={action}
            editActionConfig={editActionConfigCb}
            updateCurrentStep={updateCurrentStep}
            fields={fields}
            errors={errors}
          />
        )}
      </EuiForm>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
