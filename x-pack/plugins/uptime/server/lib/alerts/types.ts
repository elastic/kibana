/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters';
import { UMServerLibs } from '../lib';
import { AlertType, AlertInstanceState, AlertInstanceContext } from '../../../../alerts/server';

export type UptimeAlertTypeParam = Record<string, any>;
export type UptimeAlertTypeState = Record<string, any>;
export type UptimeAlertTypeFactory<ActionGroupIds extends string> = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => AlertType<
  UptimeAlertTypeParam,
  UptimeAlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  ActionGroupIds
>;
