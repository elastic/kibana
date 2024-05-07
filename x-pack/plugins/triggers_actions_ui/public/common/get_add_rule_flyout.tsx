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
import type { ConnectorServices, RuleAddProps, RuleTypeParams, RuleTypeMetaData } from '../types';
import { queryClient } from '../application/query_client';

export const getAddRuleFlyoutLazy = <
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
>(
  props: RuleAddProps<Params, MetaData> & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <QueryClientProvider client={queryClient}>
        <RuleAdd {...props} />
      </QueryClientProvider>
    </ConnectorProvider>
  );
};
