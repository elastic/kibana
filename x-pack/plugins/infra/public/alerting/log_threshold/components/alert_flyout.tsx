/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../../common/alerting/logs/log_threshold/types';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddAlertFlyout({
        consumer: 'logs',
        addFlyoutVisible: props.visible!,
        setAddFlyoutVisibility: props.setVisible,
        canChangeTrigger: false,
        alertTypeId: LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
        metadata: {
          isInternal: true,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, props.visible]
  );

  return <>{AddAlertFlyout}</>;
};
