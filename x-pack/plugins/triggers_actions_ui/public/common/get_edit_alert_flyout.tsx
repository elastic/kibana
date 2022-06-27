/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorProvider } from '../application/context/connector_context';
import { RuleEdit } from '../application/sections/rule_form';
import type { ConnectorServices, RuleEditProps as AlertEditProps } from '../types';

export const getEditAlertFlyoutLazy = (
  props: AlertEditProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <RuleEdit {...props} />
    </ConnectorProvider>
  );
};
