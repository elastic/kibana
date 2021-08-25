/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Console, ConsoleProvider } from '../../../../../components/console';
import { EndpointConsoleService } from './endpoint_console_service';
import { HostMetadata } from '../../../../../../../common/endpoint/types';

export interface EndpointConsoleProps {
  endpoint: HostMetadata;
}

export const EndpointConsole = memo<EndpointConsoleProps>(({ endpoint }) => {
  const consoleService = useMemo(() => {
    return new EndpointConsoleService(endpoint);
  }, [endpoint]);

  return (
    <ConsoleProvider service={consoleService}>
      <Console prompt="endpoint-v7.14.0 >" />
    </ConsoleProvider>
  );
});

EndpointConsole.displayName = 'EndpointConsole';
