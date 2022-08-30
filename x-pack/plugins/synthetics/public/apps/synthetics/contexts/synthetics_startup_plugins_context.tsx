/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { ClientPluginsStart } from '../../../plugin';

export const SyntheticsStartupPluginsContext = createContext<Partial<ClientPluginsStart>>({});

export const SyntheticsStartupPluginsContextProvider: React.FC<Partial<ClientPluginsStart>> = ({
  children,
  ...props
}) => <SyntheticsStartupPluginsContext.Provider value={{ ...props }} children={children} />;

export const useSyntheticsStartPlugins = () => useContext(SyntheticsStartupPluginsContext);
