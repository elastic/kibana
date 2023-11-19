/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { TriggerActionsContext } from './triggers_actions_context';
import { observabilityRuleCreationValidConsumers } from '../../../../common/constants';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AlertFlyout(props: Props) {
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddRuleFlyout({
        consumer: 'logs',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        validConsumers: observabilityRuleCreationValidConsumers,
        useRuleProducer: true,
      }),
    [triggersActionsUI, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
}

export function PrefilledThresholdAlertFlyout({ onClose }: { onClose(): void }) {
  return <AlertFlyout visible setVisible={onClose} />;
}
