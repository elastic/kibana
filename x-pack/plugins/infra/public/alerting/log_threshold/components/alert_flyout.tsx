/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { AlertAdd } from '../../../../../triggers_actions_ui/public';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../../common/alerting/logs/log_threshold/types';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  return (
    <>
      {triggersActionsUI && (
        <AlertAdd
          addFlyoutVisible={props.visible!}
          setAddFlyoutVisibility={props.setVisible}
          alertTypeId={LOG_DOCUMENT_COUNT_ALERT_TYPE_ID}
          canChangeTrigger={false}
          consumer={'logs'}
          metadata={{
            isInternal: true,
          }}
          actionTypeRegistry={triggersActionsUI.actionTypeRegistry}
          alertTypeRegistry={triggersActionsUI.alertTypeRegistry}
        />
      )}
    </>
  );
};
