/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

export const PLUGIN_ID = 'cloudDefend';
export const PLUGIN_NAME = 'Cloud Defend';
export const INTEGRATION_PACKAGE_NAME = 'cloud_defend';
export const INPUT_CONTROL = 'cloud_defend/control';
export const ALERTS_DATASET = 'cloud_defend.alerts';
export const ALERTS_INDEX_PATTERN = 'cloud_defend.alerts*';

export const POLICIES_ROUTE_PATH = '/internal/cloud_defend/policies';
export const STATUS_ROUTE_PATH = '/internal/cloud_defend/status';

export const CLOUD_DEFEND_FLEET_PACKAGE_KUERY = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${INTEGRATION_PACKAGE_NAME}`;
