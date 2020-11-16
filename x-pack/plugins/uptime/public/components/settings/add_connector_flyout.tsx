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
  ConnectorAddFlyout,
  TriggersAndActionsUiServices,
} from '../../../../triggers_actions_ui/public';
import { getConnectorsAction } from '../../state/alerts/alerts';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  focusInput: () => void;
}

export const AddConnectorFlyout = ({ focusInput }: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const {
    services: { actionTypeRegistry },
  } = useKibana<TriggersAndActionsUiServices>();

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
        <FormattedMessage
          id="xpack.uptime.alerts.settings.createConnector"
          defaultMessage="Create connector"
        />
      </EuiButtonEmpty>
      {addFlyoutVisible ? (
        <ConnectorAddFlyout
          onClose={() => setAddFlyoutVisibility(false)}
          actionTypeRegistry={actionTypeRegistry}
        />
      ) : null}
    </>
  );
};
