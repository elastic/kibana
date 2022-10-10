/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { AgentExplorerDetails } from "../../app/agent_explorer_details";
import { AgentExplorerOverview } from "../../app/agent_explorer_overview";

export const agentExplorer = {
  '/agent-explorer': {
    element: (
      <AgentExplorerOverview>
        <Outlet />
      </AgentExplorerOverview>
    ),
    children: {
      '/agent-explorer': {
        element: <AgentExplorerDetails />,
      },
    },
  },
};
  