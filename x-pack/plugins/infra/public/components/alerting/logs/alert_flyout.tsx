/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { AlertsContextProvider, AlertAdd } from '../../../../../triggers_actions_ui/public';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../../common/alerting/logs/types';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const { services } = useKibana();

  return (
    <>
      {triggersActionsUI && (
        <AlertsContextProvider
          value={{
            metadata: {
              isInternal: true,
            },
            toastNotifications: services.notifications?.toasts,
            http: services.http,
            docLinks: services.docLinks,
            actionTypeRegistry: triggersActionsUI.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUI.alertTypeRegistry,
          }}
        >
          <AlertAdd
            addFlyoutVisible={props.visible!}
            setAddFlyoutVisibility={props.setVisible}
            alertTypeId={LOG_DOCUMENT_COUNT_ALERT_TYPE_ID}
            canChangeTrigger={false}
            consumer={'logs'}
          />
        </AlertsContextProvider>
      )}
    </>
  );
};
