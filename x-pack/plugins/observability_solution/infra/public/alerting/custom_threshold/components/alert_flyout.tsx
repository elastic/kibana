/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useMemo } from 'react';
import type { RuleAddProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';

interface Props {
  onClose: RuleAddProps['onClose'];
}

export function AlertFlyout({ onClose }: Props) {
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const addAlertFlyout = useMemo(() => {
    if (!triggersActionsUI) {
      return null;
    }

    return triggersActionsUI.getAddRuleFlyout({
      consumer: 'infrastructure',
      onClose,
      canChangeTrigger: false,
      ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      metadata: {
        currentOptions: {
          /*
          Setting the groupBy is currently required in custom threshold
          rule for it to populate the rule with additional host context.
          */
          groupBy: 'host.name',
        },
      },
    });
  }, [onClose, triggersActionsUI]);

  return addAlertFlyout;
}
