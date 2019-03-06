/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AppCore, AppPlugins } from '../../shim';

export interface AppContextInterface {
  core: AppCore;
  plugins: AppPlugins;
}

export const AppContext = React.createContext<AppContextInterface | null>(null);
