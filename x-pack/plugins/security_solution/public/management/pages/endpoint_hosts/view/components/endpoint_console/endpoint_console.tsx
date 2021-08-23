/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Console, ConsoleProvider } from '../../../../../components/console';

export interface EndpointConsoleProps {
  endpoint: string;
}

export const EndpointConsole = memo<EndpointConsoleProps>(() => {
  return (
    <ConsoleProvider service={{}}>
      <Console prompt="endpoint-v7.14.0 >" />
    </ConsoleProvider>
  );
});

EndpointConsole.displayName = 'EndpointConsole';
