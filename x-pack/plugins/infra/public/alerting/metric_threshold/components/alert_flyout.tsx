/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { ApplicationStart, DocLinksStart, HttpStart, NotificationsStart } from 'src/core/public';

import { AlertsContextProvider, AlertAdd } from '../../../../../triggers_actions_ui/public';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../server/lib/alerting/metric_threshold/types';
import { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

interface Props {
  visible?: boolean;
  options?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

interface KibanaDeps {
  notifications: NotificationsStart;
  http: HttpStart;
  docLinks: DocLinksStart;
  application: ApplicationStart;
}

export const AlertFlyout = (props: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const { services } = useKibana<KibanaDeps>();

  return (
    <>
      {triggersActionsUI && (
        <AlertsContextProvider
          value={{
            metadata: {
              currentOptions: props.options,
              series: props.series,
            },
            toastNotifications: services.notifications.toasts,
            http: services.http,
            docLinks: services.docLinks,
            capabilities: services.application.capabilities,
            actionTypeRegistry: triggersActionsUI.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUI.alertTypeRegistry,
          }}
        >
          <AlertAdd
            addFlyoutVisible={props.visible!}
            setAddFlyoutVisibility={props.setVisible}
            alertTypeId={METRIC_THRESHOLD_ALERT_TYPE_ID}
            canChangeTrigger={false}
            consumer={'infrastructure'}
          />
        </AlertsContextProvider>
      )}
    </>
  );
};
