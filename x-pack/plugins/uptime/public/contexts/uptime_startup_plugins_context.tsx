/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { ClientPluginsStart } from '../apps/plugin';

export const UptimeStartupPluginsContext = createContext<Partial<ClientPluginsStart>>({});

export const UptimeStartupPluginsContextProvider: React.FC<Partial<ClientPluginsStart>> = ({
  children,
  ...props
}) => <UptimeStartupPluginsContext.Provider value={{ ...props }} children={children} />;
