/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import DashboardLink from './dashboard_link';
import { BEDROCK } from './translations';
import { bedrockConfig, bedrockSecrets } from './constants';

const BedrockConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const [{ id, name }] = useFormData();
  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={bedrockConfig}
        secretsFormSchema={bedrockSecrets}
      />
      {isEdit && <DashboardLink connectorId={id} connectorName={name} selectedProvider={BEDROCK} />}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { BedrockConnectorFields as default };
