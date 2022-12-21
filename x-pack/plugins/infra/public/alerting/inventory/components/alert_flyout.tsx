/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { useAlertPrefillContext } from '../../use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  setVisible(val: boolean): void;
}

export const AlertFlyout = ({ options, nodeType, filter, visible, setVisible }: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const { inventoryPrefill } = useAlertPrefillContext();
  const { customMetrics } = inventoryPrefill;
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddAlertFlyout({
        consumer: 'infrastructure',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
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

  return <>{visible && AddAlertFlyout}</>;
};

export const PrefilledInventoryAlertFlyout = ({ onClose }: { onClose(): void }) => {
  const { inventoryPrefill } = useAlertPrefillContext();
  const { nodeType, metric, filterQuery } = inventoryPrefill;

  return (
    <AlertFlyout
      options={{ metric }}
      nodeType={nodeType}
      filter={filterQuery}
      visible
      setVisible={onClose}
    />
  );
};
