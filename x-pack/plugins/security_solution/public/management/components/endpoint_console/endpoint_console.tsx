/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Console } from '../console';
import { EndpointConsoleCommandService } from './endpoint_console_command_service';
import type { HostMetadata } from '../../../../common/endpoint/types';

export interface EndpointConsoleProps {
  endpoint: HostMetadata;
}

export const EndpointConsole = memo<EndpointConsoleProps>(({ endpoint }) => {
  const consoleService = useMemo(() => {
    return new EndpointConsoleCommandService(endpoint);
  }, [endpoint]);

  return (
    <Console prompt={`endpoint-${endpoint.agent.version} >`} commandService={consoleService} />
  );
});

EndpointConsole.displayName = 'EndpointConsole';
