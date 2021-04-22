/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ConnectorAddFlyoutProps } from '../application/sections/action_connector_form/connector_add_flyout';
import { ConnectorAddFlyout } from '../application/sections/action_connector_form';

export const getAddConnectorFlyoutLazy = (props: ConnectorAddFlyoutProps) => {
  return <ConnectorAddFlyout {...props} />;
};
