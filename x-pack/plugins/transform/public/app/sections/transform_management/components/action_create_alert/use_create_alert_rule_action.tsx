/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useTransformCapabilities } from '../../../../hooks';
import type { TransformListAction, TransformListRow } from '../../../../common';
import {
  crateAlertRuleActionNameText,
  CreateAlertRuleActionName,
} from './create_alert_rule_action_name';
import { useAlertRuleFlyout } from '../../../../../alerting/transform_alerting_flyout';
import { isContinuousTransform } from '../../../../../../common/types/transform';

export type CreateAlertRuleAction = ReturnType<typeof useCreateAlertRuleAction>;
export const useCreateAlertRuleAction = (forceDisable: boolean) => {
  const { canCreateTransformAlerts } = useTransformCapabilities();
  const { setCreateAlertRule } = useAlertRuleFlyout();

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      setCreateAlertRule(item.id);
    },
    [setCreateAlertRule]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <CreateAlertRuleActionName disabled={!canCreateTransformAlerts} />
      ),
      available: (item: TransformListRow) => isContinuousTransform(item.config),
      enabled: () => canCreateTransformAlerts && !forceDisable,
      description: crateAlertRuleActionNameText,
      type: 'icon',
      icon: 'bell',
      onClick: clickHandler,
      'data-test-subj': 'transformActionCreateAlertRule',
    }),
    [canCreateTransformAlerts, forceDisable, clickHandler]
  );

  return { action };
};
