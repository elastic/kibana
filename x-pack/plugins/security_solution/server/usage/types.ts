/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/server';
import { EndpointAppContext } from '../endpoint/types';
import { SetupPlugins } from '../plugin';

export type CollectorDependencies = {
  kibanaIndex: string;
  signalsIndex: string;
  core: CoreSetup;
  endpointAppContext: EndpointAppContext;
} & Pick<SetupPlugins, 'ml' | 'usageCollection'>;
