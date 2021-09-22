/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectAttributes } from 'kibana/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface __DO_NOT_USE__IRuleActionsAttributes extends Record<string, any> {
  ruleAlertId: string;
  actions: RuleAlertAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated
 */
export interface __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes
  extends __DO_NOT_USE__IRuleActionsAttributes,
    SavedObjectAttributes {}

/**
 * @deprecated Remove this once
 */
export interface __DO_NOT_USE__RuleActions {
  id: string;
  actions: RuleAlertAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}
