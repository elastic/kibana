/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import type { ValidFeatureId } from '@kbn/rule-data-utils';

export const infraAlertFeatureId = 'infrastructure';
export const infraAlertFeatureIds: ValidFeatureId[] = [AlertConsumers.INFRASTRUCTURE];

export const ALERTS_PER_PAGE = 10;
export const ALERTS_TABLE_ID = 'xpack.infra.hosts.alerts.table';
