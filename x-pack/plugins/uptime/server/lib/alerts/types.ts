/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../../../../alerting/server';
import { UptimeCoreSetup } from '../adapters';
import { UMServerLibs } from '../lib';

export type UptimeAlertTypeFactory = (server: UptimeCoreSetup, libs: UMServerLibs) => AlertType;
