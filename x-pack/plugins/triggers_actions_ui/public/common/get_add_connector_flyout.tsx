/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CreateConnectorFlyout } from '../application/sections/action_connector_form';
import { CreateConnectorFlyoutProps } from '../application/sections/action_connector_form/create_connector_flyout';

export const getAddConnectorFlyoutLazy = (props: CreateConnectorFlyoutProps) => {
  return <CreateConnectorFlyout {...props} />;
};
