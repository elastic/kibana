/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '../../../../common/alerting/logs/log_threshold/types';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddAlertFlyout({
        consumer: 'logs',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
        metadata: {
          isInternal: true,
        },
      }),
    [triggersActionsUI, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
};
