/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

export const AgentRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentRefresh() {
  return React.useContext(AgentRefreshContext).refresh;
}
