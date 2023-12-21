/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';

export const ActionGroupId = 'Tracked entity contained';
export const RecoveryActionGroupId = 'notGeoContained';
export const GEO_CONTAINMENT_ID = '.geo-containment';
export const OTHER_CATEGORY = 'other';

export const FIELD_KEY_ENTITY_ID = `${ALERT_NAMESPACE}.entityId`;
export const FIELD_KEY_ENTITY_TIMESTAMP = `${ALERT_NAMESPACE}.entityTimestamp`;
export const FIELD_KEY_ENTITY_LOCATION = `${ALERT_NAMESPACE}.entityLocation`;
export const FIELD_KEY_DETECTION_TIMESTAMP = `${ALERT_NAMESPACE}.detectionTimestamp`;
export const FIELD_KEY_BOUNDARY_ID = `${ALERT_NAMESPACE}.boundaryId`;
export const FIELD_KEY_BOUNDARY_NAME = `${ALERT_NAMESPACE}.boundaryName`;
