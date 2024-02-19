/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { SnapshotCustomMetricInput } from '../../../../common/http_api';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { useAlertPrefillContext } from '../../use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  // only shows for AWS when there are accounts info
  accountId?: string;
  // only shows for AWS when there are regions info
  region?: string;
  filter?: string;
  customMetrics?: SnapshotCustomMetricInput[];
  setVisible(val: boolean): void;
}

export const AlertFlyout = ({
  options,
  nodeType,
  filter,
  visible,
  setVisible,
  customMetrics = [],
  accountId = '',
  region = '',
}: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddRuleFlyout({
        consumer: 'infrastructure',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
        metadata: {
          accountId,
          options,
          nodeType,
          filter,
          customMetrics,
          region,
        },
        useRuleProducer: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, visible]
  );

  return <>{visible && AddAlertFlyout}</>;
};

export const PrefilledInventoryAlertFlyout = ({ onClose }: { onClose(): void }) => {
  const { inventoryPrefill } = useAlertPrefillContext();
  const { nodeType, metric, filterQuery, accountId, region, customMetrics } = inventoryPrefill;

  return (
    <AlertFlyout
      accountId={accountId}
      options={{ metric }}
      nodeType={nodeType}
      filter={filterQuery}
      region={region}
      customMetrics={customMetrics}
      visible
      setVisible={onClose}
    />
  );
};
