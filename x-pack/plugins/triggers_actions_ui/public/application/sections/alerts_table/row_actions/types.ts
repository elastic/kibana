/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderCustomActionsRowArgs } from '../../../../types';

export interface AlertActionsProps extends RenderCustomActionsRowArgs {
  onActionExecuted?: () => void;
  isAlertDetailsEnabled?: boolean;
  /**
   * Implement this to resolve your app's specific rule page path, return null to avoid showing the link
   */
  resolveRulePagePath?: (ruleId: string, currentPageId: string) => string | null;
  /**
   * Implement this to resolve your app's specific alert page path, return null to avoid showing the link
   */
  resolveAlertPagePath?: (alertId: string, currentPageId: string) => string | null;
}
