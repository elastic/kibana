/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters';
import { UMServerLibs } from '../lib';
import { AlertType } from '../../../../alerts/server';

export type UptimeAlertTypeFactory = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => AlertType;
