/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';

interface UptimeStartupPluginsContextValues {
  embeddable?: any;
}

export const UptimeStartupPluginsContext = createContext<UptimeStartupPluginsContextValues>({});

export const UptimeStartupPluginsContextProvider: React.FC<UptimeStartupPluginsContextValues> = ({
  children,
  embeddable,
}) => <UptimeStartupPluginsContext.Provider value={{ embeddable }} children={children} />;
