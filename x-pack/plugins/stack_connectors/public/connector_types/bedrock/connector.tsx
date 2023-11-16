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
import { bedrockConfig, bedrockSecrets } from './constants';

const BedrockConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={bedrockConfig}
      secretsFormSchema={bedrockSecrets}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { BedrockConnectorFields as default };
