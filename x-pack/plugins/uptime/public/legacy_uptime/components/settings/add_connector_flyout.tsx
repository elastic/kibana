/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDispatch } from 'react-redux';
import { EuiButtonEmpty } from '@elastic/eui';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getConnectorsAction } from '../../state/alerts/alerts';

interface Props {
  focusInput: () => void;
  isDisabled: boolean;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AddConnectorFlyout = ({ focusInput, isDisabled }: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const {
    services: {
      application,
      triggersActionsUi: { getAddConnectorFlyout },
    },
  } = useKibana<KibanaDeps>();

  const canEdit: boolean = !!application?.capabilities.actions.save;

  const dispatch = useDispatch();

  const ConnectorAddFlyout = useMemo(
    () =>
      getAddConnectorFlyout({
        onClose: () => {
          dispatch(getConnectorsAction.get());
          setAddFlyoutVisibility(false);
          focusInput();
        },
        featureId: 'uptime',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      {addFlyoutVisible ? ConnectorAddFlyout : null}
      <EuiButtonEmpty
        data-test-subj="createConnectorButton"
        onClick={() => setAddFlyoutVisibility(true)}
        size="s"
        isDisabled={isDisabled || !canEdit}
      >
        <FormattedMessage
          id="xpack.uptime.alerts.settings.addConnector"
          defaultMessage="Add connector"
        />
      </EuiButtonEmpty>
    </>
  );
};
