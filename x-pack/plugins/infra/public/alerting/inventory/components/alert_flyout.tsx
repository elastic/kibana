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
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { useAlertPrefillContext } from '../../../alerting/use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

interface KibanaDeps {
  notifications: NotificationsStart;
  http: HttpStart;
  docLinks: DocLinksStart;
  application: ApplicationStart;
}

export const AlertFlyout = ({ options, nodeType, filter, visible, setVisible }: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const { services } = useKibana<KibanaDeps>();

  const { inventoryPrefill } = useAlertPrefillContext();
  const { customMetrics } = inventoryPrefill;

  return (
    <>
      {triggersActionsUI && (
        <AlertsContextProvider
          value={{
            metadata: {
              options,
              nodeType,
              filter,
              customMetrics,
            },
            toastNotifications: services.notifications?.toasts,
            http: services.http,
            docLinks: services.docLinks,
            capabilities: services.application.capabilities,
            actionTypeRegistry: triggersActionsUI.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUI.alertTypeRegistry,
          }}
        >
          <AlertAdd
            addFlyoutVisible={visible!}
            setAddFlyoutVisibility={setVisible}
            alertTypeId={METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID}
            canChangeTrigger={false}
            consumer={'infrastructure'}
          />
        </AlertsContextProvider>
      )}
    </>
  );
};
