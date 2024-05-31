/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { InfraPublicConfig } from '../../common/plugin_config_types';

const PluginConfigContext = createContext<InfraPublicConfig | undefined>(undefined);

export const usePluginConfig = (): InfraPublicConfig => {
  const context = useContext(PluginConfigContext);

  if (context === undefined) {
    throw new Error(
      'PluginConfigContext value was not initialized. Use context provider to set the value before using it.'
    );
  }

  return context;
};

export const PluginConfigProvider = PluginConfigContext.Provider;
