/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { EuiButtonEmpty } from '@elastic/eui';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../triggers_actions_ui/public';
import { getConnectorsAction } from '../../state/alerts/alerts';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../observability/public';
import { fetchActionTypes } from '../../state/api/alerts';

import { ActionTypeId } from './types';

interface Props {
  focusInput: () => void;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const ALLOWED_ACTION_TYPES: ActionTypeId[] = [
  '.slack',
  '.pagerduty',
  '.server-log',
  '.index',
  '.teams',
  '.servicenow',
  '.jira',
  '.webhook',
];

export const AddConnectorFlyout = ({ focusInput }: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const {
    services: {
      triggersActionsUi: { getAddConnectorFlyout },
    },
  } = useKibana<KibanaDeps>();

  const dispatch = useDispatch();

  const { data: actionTypes } = useFetcher(() => fetchActionTypes(), []);

  const ConnectorAddFlyout = useMemo(
    () =>
      getAddConnectorFlyout({
        consumer: 'uptime',
        onClose: () => {
          dispatch(getConnectorsAction.get());
          setAddFlyoutVisibility(false);
          focusInput();
        },
        actionTypes: (actionTypes ?? []).filter((actionType) =>
          ALLOWED_ACTION_TYPES.includes(actionType.id as ActionTypeId)
        ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionTypes]
  );

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="createConnectorButton"
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
