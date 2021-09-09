/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @deprecated EVENTS_INDEX_PREFIX is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const EVENTS_INDEX_PREFIX = '.kibana_alerts-security.events';

/**
 * @deprecated MESSAGE is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const MESSAGE = 'message' as const;

/**
 * @deprecated EVENT_SEQUENCE is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const EVENT_SEQUENCE = 'event.sequence' as const;

/**
 * @deprecated EVENT_DURATION is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const EVENT_DURATION = 'event.duration' as const;

/**
 * @deprecated EVENT_END is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const EVENT_END = 'event.end' as const;

/**
 * @deprecated RULE_STATUS is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const RULE_STATUS = 'kibana.rac.detection_engine.rule_status' as const;

/**
 * @deprecated RULE_STATUS_SEVERITY is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const RULE_STATUS_SEVERITY = 'kibana.rac.detection_engine.rule_status_severity' as const;
