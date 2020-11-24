/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { EuiButtonEmpty } from '@elastic/eui';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../triggers_actions_ui/public';
  ActionsConnectorsContextProvider,

import { getConnectorsAction } from '../../state/alerts/alerts';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  focusInput: () => void;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AddConnectorFlyout = ({ focusInput }: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const {
    services: {
      triggersActionsUi: { getAddConnectorFlyout },
    },
  } = useKibana<KibanaDeps>();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getConnectorsAction.get());
    focusInput();
  }, [addFlyoutVisible, dispatch, focusInput]);

  const ConnectorAddFlyout = useMemo(
    () =>
      getAddConnectorFlyout({
        consumer: 'uptime',
        onClose: () => setAddFlyoutVisibility(false),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
      {addFlyoutVisible ? ConnectorAddFlyout : null}
    </>
  );
};
