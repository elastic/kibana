/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';

import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
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

export const AlertFlyout = ({ options, nodeType, filter, visible, setVisible }: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const { inventoryPrefill } = useAlertPrefillContext();
  const { customMetrics } = inventoryPrefill;

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddAlertFlyout({
        consumer: 'infrastructure',
        addFlyoutVisible: visible!,
        setAddFlyoutVisibility: setVisible,
        canChangeTrigger: false,
        alertTypeId: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
        metadata: {
          options,
          nodeType,
          filter,
          customMetrics,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, visible]
  );

  return <>{AddAlertFlyout}</>;
};
