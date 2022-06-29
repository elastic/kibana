/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorProvider } from '../application/context/connector_context';
import { ActionForm } from '../application/sections';
import { ActionAccordionFormProps } from '../application/sections/action_connector_form/action_form';
import { ConnectorServices } from '../types';

export const getActionFormLazy = (
  props: ActionAccordionFormProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <ActionForm {...props} />
    </ConnectorProvider>
  );
};
