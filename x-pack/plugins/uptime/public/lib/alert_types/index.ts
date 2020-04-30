/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { initMonitorStatusAlertType } from './monitor_status';

export type AlertTypeInitializer = (dependenies: { autocomplete: any }) => AlertTypeModel;

export const alertTypeInitializers: AlertTypeInitializer[] = [initMonitorStatusAlertType];
