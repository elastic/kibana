/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  DeleteModalConfirmation,
  DeleteModalConfirmationProps,
} from '../application/components/delete_modal_confirmation';
import { ConnectorProvider } from '../application/context/connector_context';
import { ConnectorServices } from '../types';

const queryClient = new QueryClient();

export const getDeleteConnectorModalConfirmationLazy = (
  props: DeleteModalConfirmationProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <QueryClientProvider client={queryClient}>
        <DeleteModalConfirmation {...props} />
      </QueryClientProvider>
    </ConnectorProvider>
  );
};
