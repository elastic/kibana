/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  ConnectorValidationFunc,
  ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { Connector } from '../../sections/action_connector_form/types';

interface FormTestProviderProps {
  children: (
    registerPreSubmitValidator: ActionConnectorFieldsProps['registerPreSubmitValidator']
  ) => React.ReactNode;
  connector: Connector;
}

const FormTestProviderComponent: React.FC<FormTestProviderProps> = ({ children, connector }) => {
  const { form } = useForm({ defaultValue: connector });
  const [_, setPreSubmitValidator] = useState<ConnectorValidationFunc | null>(null);

  const registerPreSubmitValidator = useCallback((validator: ConnectorValidationFunc) => {
    setPreSubmitValidator(() => validator);
  }, []);

  return <Form form={form}>{children(registerPreSubmitValidator)}</Form>;
};

FormTestProviderComponent.displayName = 'FormTestProvider';

export const FormTestProvider = React.memo(FormTestProviderComponent);
