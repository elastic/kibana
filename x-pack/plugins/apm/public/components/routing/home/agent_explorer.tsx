/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import React from 'react';
import { page } from '.';
import { AgentExplorerDetails } from '../../app/agent_explorer_details';

export const agentExplorer = {
  ...page({
    path: '/agent-explorer',
    title: i18n.translate('xpack.apm.agentExplorer.title', {
      defaultMessage: 'Agent Explorer',
    }),
    element: <AgentExplorerDetails />,
    params: t.partial({
      query: t.partial({
        agentLanguage: t.string,
        serviceName: t.string,
      }),
    }),
  }),
};
