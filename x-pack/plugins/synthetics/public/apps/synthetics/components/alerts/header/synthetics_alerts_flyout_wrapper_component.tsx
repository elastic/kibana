/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiFlyout } from '@elastic/eui';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { useSyntheticsAlert } from './use_synthetics_alert';

interface Props {
  alertFlyoutVisible: boolean;
  alertTypeId?: string;
  setAlertFlyoutVisibility: (value: boolean) => void;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const SyntheticsAlertsFlyoutWrapperComponent = ({
  alertFlyoutVisible,
  setAlertFlyoutVisibility,
}: Props) => {
  const { triggersActionsUi } = useKibana<KibanaDeps>().services;
  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );

  const { alert, loading } = useSyntheticsAlert();

  const EditAlertFlyout = useMemo(() => {
    if (!alert) {
      return null;
    }
    return triggersActionsUi.getEditAlertFlyout({
      onClose: onCloseAlertFlyout,
      initialRule: alert,
    });
  }, [alert, onCloseAlertFlyout, triggersActionsUi]);

  if (loading && !alert) {
    return (
      <EuiFlyout ownFocus onClose={() => setAlertFlyoutVisibility(false)} style={{ maxWidth: 620 }}>
        <EuiFlyoutHeader hasBorder />
        <EuiFlyoutBody>
          <LoadingState />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return <>{alertFlyoutVisible && EditAlertFlyout}</>;
};
