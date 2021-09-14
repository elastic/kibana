/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// We import this restricted area so we can get access to the SO "Raw" types from alerting
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { RawAlertAction, RawAlert } from '../../../../../../alerting/server/types';

/**
 * This is the legacy Actions type.
 * This type should _never_ be used outside of this one use case.
 * @deprecated Remove this once we have no more migrations for "legacy actions" left.
 */
export interface Actions {
  id: string;
  params: {
    message: string;
  };
  action_type_id: string;
  group: string;
}

/**
 * This is the legacy Actions side car type.
 * NOTE: I intentionally do _NOT_ use other types from other parts of the system.
 * This type should _never_ be used outside of this one use case.
 * @deprecated Remove this once we no longer need this migration and this code is all deleted
 */
export interface SideCarAction {
  ruleAlertId: string;
  actions: Actions[];
  ruleThrottle: string;
  alertThrottle: string;
}

/**
 * We carefully pull in this one restricted path and the RawAlertAction to use within this part of our migration code.
 * @deprecated Remove this once we no longer need this migration code.
 */
export type AlertingActions = RawAlertAction;

/**
 * We carefully pull in this one restricted path and the RawAlertAction to use within this part of our migration code.
 * @deprecated Remove this once we no longer need this migration code.
 */
export type Alerting = RawAlert;
