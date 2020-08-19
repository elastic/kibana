/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
} from '../../../../triggers_actions_ui/public';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { getConnectorsAction } from '../../state/alerts/alerts';

interface Props {
  focusInput: () => void;
}
export const AddConnectorFlyout = ({ focusInput }: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);

  const {
    services: {
      triggers_actions_ui: { actionTypeRegistry },
      application,
      docLinks,
      http,
      notifications,
    },
  } = useKibana();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getConnectorsAction.get());
    focusInput();
  }, [addFlyoutVisible, dispatch, focusInput]);

  return (
    <>
      <EuiButtonEmpty
        iconType="plusInCircleFilled"
        iconSide="left"
        onClick={() => setAddFlyoutVisibility(true)}
      >
        <FormattedMessage id="emptyButton" defaultMessage="Create connector" />
      </EuiButtonEmpty>
      <ActionsConnectorsContextProvider
        value={{
          http,
          docLinks,
          actionTypeRegistry,
          toastNotifications: notifications?.toasts,
          capabilities: application?.capabilities,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={setAddFlyoutVisibility}
        />
      </ActionsConnectorsContextProvider>
    </>
  );
};
