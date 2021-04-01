/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';

import { GetMlSharedImportsReturnType } from '../../shared_imports';

// This code is a workaround to provide dependencies that are
// loaded dynamically during runtime.
export const MlSharedContext = createContext({} as GetMlSharedImportsReturnType);
