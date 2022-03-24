/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionConnectorFieldsProps } from '../../../../types';

import { ServiceNowActionConnector } from './types';
import { Credentials } from './credentials';

const ServiceNowConnectorFieldsNoApp: React.FC<
  ActionConnectorFieldsProps<ServiceNowActionConnector>
> = ({ action, editActionSecrets, editActionConfig, errors, readOnly }) => {
  return (
    <>
      <Credentials
        action={action}
        errors={errors}
        readOnly={readOnly}
        isLoading={false}
        editActionSecrets={editActionSecrets}
        editActionConfig={editActionConfig}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFieldsNoApp as default };
