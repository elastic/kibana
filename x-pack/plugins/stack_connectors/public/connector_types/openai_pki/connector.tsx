/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 * 
 * By: Antonio Piazza @antman1p
 */

import React from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import DashboardLink from './dashboard_link';
import { openAiConfig, openAiSecrets } from './constants';

const ConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const [{ id, name }] = useFormData({
    watch: [],
  });

  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={openAiConfig}
        secretsFormSchema={openAiSecrets}
      />
      <EuiSpacer size="s" />
      {isEdit && (
        <DashboardLink
          connectorId={id}
          connectorName={name}
          selectedProvider="OpenAIPki"
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorFields as default };
