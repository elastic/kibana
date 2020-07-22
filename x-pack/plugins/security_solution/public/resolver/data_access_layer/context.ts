/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataAccessLayer } from '../types';

/**
 * Provides the dataAccessLayer to Resolver. This is used in production via the `Resolver` component or in tests to provide a fake data access layer.
 *
 * We can't provide a data access layer statically because it needs a reference to kibana context. Therefore we allow `null`. Code needs to check for a valid `DataAccessLayer` before using it.
 **/
export const DataAccessLayerContext = React.createContext<DataAccessLayer | null>(null);
