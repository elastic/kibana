/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConnectorProvider } from '../application/context/connector_context';
import { RuleAdd } from '../application/sections/rule_form';
import type { ConnectorServices, RuleAddProps } from '../types';
import { queryClient } from '../application/query_client';

export const getAddRuleFlyoutLazy = (
  props: RuleAddProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <QueryClientProvider client={queryClient}>
        <RuleAdd {...props} />
      </QueryClientProvider>
    </ConnectorProvider>
  );
};
