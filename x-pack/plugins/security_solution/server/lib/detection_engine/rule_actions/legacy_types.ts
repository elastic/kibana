/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/core/server';
import { RuleActionParams } from '@kbn/alerting-plugin/common';

/**
 * This was the pre-7.16 version of LegacyRuleAlertAction and how it was stored on disk pre-7.16.
 * Post 7.16 this is how it is serialized from the saved object from disk since we are using saved object references.
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyRuleAlertAction {
  group: string;
  id: string;
  params: RuleActionParams;
  action_type_id: string;
}

/**
 * This is how it is stored on disk in its "raw format" for 7.16+
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyRuleAlertSavedObjectAction {
  group: string;
  params: RuleActionParams;
  action_type_id: string;
  actionRef: string;
}

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated Remove this once the legacy notification/side car is gone
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LegacyIRuleActionsAttributes extends Record<string, any> {
  actions: LegacyRuleAlertSavedObjectAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyIRuleActionsAttributesSavedObjectAttributes
  extends LegacyIRuleActionsAttributes,
    SavedObjectAttributes {}

/**
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyRuleActions {
  id: string;
  actions: LegacyRuleAlertAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}
