/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import { AlertsContextProvider, AlertAdd } from '../../../../triggers_actions_ui/public';
import { TriggerActionsContext } from '../../utils/triggers_actions_context';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  visible?: boolean;
  fields: IFieldType[];
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
            http: services.http,
            addFlyoutVisible: props.visible!,
            setAddFlyoutVisibility: props.setVisible,
            actionTypeRegistry: triggersActionsUI.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUI.alertTypeRegistry,
          }}
        >
          <AlertAdd alertTypeId={'example'} canChangeTrigger={false} consumer={'watcher'} />
        </AlertsContextProvider>
      )}
    </>
  );
};
