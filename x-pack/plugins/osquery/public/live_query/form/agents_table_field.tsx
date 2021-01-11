/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AgentListPage } from '../../../../fleet/public';

const AgentsTableFieldComponent = (payload) => {
  console.error('AgentsTableFieldComponent', payload);
  return <AgentListPage />;
};

export const AgentsTableField = React.memo(AgentsTableFieldComponent);
