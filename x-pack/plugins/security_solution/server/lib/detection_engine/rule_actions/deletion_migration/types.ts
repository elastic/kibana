/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: I intentionally do _NOT_ use other types from other parts of the system such as
 * Kibana alerting because as those types evolve and change this structure will not. This is
 * migration code which should feel like it is written in "stone" and not actively maintained.
 * Once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed, this should be too.
 * This type should _never_ be used outside of this one use case.
 * @deprecated Remove this once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed.
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
 * This is technically the current alerting actions from kibana-alerting.
 * TODO: Can we use the regular one from their side? This can be updated.
 */
export interface AlertingActions {
  params: {
    message: string;
  };
  actionTypeId: string;
  group: string;
  actionRef: string;
}

/**
 * This is technically the current alerting shape.
 * TODO: Can we use their regular type here instead? This can be updated.
 */
export interface Alerting {
  name: string;
  actions: AlertingActions[];
  alertTypeId: string;
  updatedBy: string;
  apiKey: string | null;
  apiKeyOwner: string;
  notifyWhen: string | null;
  throttle: string | null;
  muteAll: boolean;
}

/**
 * TODO: Can we use the regular kibana-core reference from somewhere? This will need to be updated
 */
export interface Reference {
  id: string;
  name: string;
  type: string;
}

/**
 * NOTE: I intentionally do _NOT_ use other types from other parts of the system such as
 * Kibana alerting because as those types evolve and change this structure will not. This is
 * migration code which should feel like it is written in "stone" and not actively maintained.
 * Once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed, this should be too.
 * This type should _never_ be used outside of this one use case.
 * @deprecated Remove this once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed.
 */
export interface SideCarAction {
  ruleAlertId: string;
  actions: Actions[];
  ruleThrottle: string;
  alertThrottle: string;
}
