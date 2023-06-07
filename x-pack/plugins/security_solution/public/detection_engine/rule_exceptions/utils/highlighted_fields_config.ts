/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const highlightedFieldsPrefixToExclude = ['kibana.alert.rule', 'signal.rule', 'rule'];

export const getKibanaAlertIdField = (id: string) => `kibana.alert.${id}`;

export const EVENT_CATEGORY = 'event.category';
export const EVENT_CODE = 'event.code';
export const KIBANA_ALERT_RULE_TYPE = 'kibana.alert.rule.type';
