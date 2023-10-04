/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '../../../../common/constants';
import { MetricsExplorerSeries } from '../../../../common/threshold_rule/metrics_explorer';

import { TriggerActionsContext } from './triggers_actions_context';
import { useAlertPrefillContext } from '../helpers/use_alert_prefill';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';

interface Props {
  visible?: boolean;
  options?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AlertFlyout(props: Props) {
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddRuleFlyout({
        consumer: 'alerts',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        metadata: {
          currentOptions: props.options,
          series: props.series,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
}

export function PrefilledThresholdAlertFlyout({ onClose }: { onClose(): void }) {
  const { metricThresholdPrefill } = useAlertPrefillContext();
  const { groupBy, filterQuery, metrics } = metricThresholdPrefill;

  return <AlertFlyout options={{ groupBy, filterQuery, metrics }} visible setVisible={onClose} />;
}
