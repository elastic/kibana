/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './api/register_routes';

// eslint-disable-next-line no-restricted-imports
export { legacyRulesNotificationAlertType } from './logic/notifications/legacy_rules_notification_alert_type';
// eslint-disable-next-line no-restricted-imports
export { legacyIsNotificationAlertExecutor } from './logic/notifications/legacy_types';
// eslint-disable-next-line no-restricted-imports
export type {
  LegacyRuleNotificationAlertType,
  LegacyRuleNotificationAlertTypeParams,
} from './logic/notifications/legacy_types';
export type { NotificationRuleTypeParams } from './logic/notifications/schedule_notification_actions';
export { scheduleNotificationActions } from './logic/notifications/schedule_notification_actions';
export { scheduleThrottledNotificationActions } from './logic/notifications/schedule_throttle_notification_actions';
export { getNotificationResultsLink } from './logic/notifications/utils';

// eslint-disable-next-line no-restricted-imports
export { legacyGetBulkRuleActionsSavedObject } from './logic/rule_actions/legacy_get_bulk_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
export type { LegacyRulesActionsSavedObject } from './logic/rule_actions/legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
export { legacyGetRuleActionsSavedObject } from './logic/rule_actions/legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
export {
  legacyType,
  legacyRuleActionsSavedObjectType,
} from './logic/rule_actions/legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
export type {
  LegacyRuleActions,
  LegacyRuleAlertAction,
  LegacyIRuleActionsAttributes,
  LegacyRuleAlertSavedObjectAction,
  LegacyIRuleActionsAttributesSavedObjectAttributes,
} from './logic/rule_actions/legacy_types';
