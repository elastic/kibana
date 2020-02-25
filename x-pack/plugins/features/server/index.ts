/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { Plugin } from './plugin';

// These exports are part of public Features plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change. Ideally we should
// reduce number of such exports to zero and provide everything we want to expose via Setup/Start
// run-time contracts.
export { uiCapabilitiesRegex } from './feature_schema';

export { Feature, FeatureWithAllOrReadPrivileges, FeatureKibanaPrivileges } from '../common';
export { PluginSetupContract } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
