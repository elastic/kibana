/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionConnectorFieldsProps } from '../../../../types';
import { TinesActionConnector } from './types';
import { SimpleConnectorForm } from '../../simple_connector_form';

const TinesConnectorFields: React.FC<ActionConnectorFieldsProps<TinesActionConnector>> = (
  params
) => {
  return (
    <SimpleConnectorForm
      {...params}
      configFormSchema={[{ id: 'url', label: 'URL' }]}
      secretsFormSchema={[
        { id: 'email', label: 'Email' },
        { id: 'apiToken', label: 'API Token' },
      ]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { TinesConnectorFields as default };
