/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useAlertPrefillContext } from '../../../alerting/use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddAlertFlyout({
        consumer: 'infrastructure',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: METRIC_THRESHOLD_ALERT_TYPE_ID,
        metadata: {
          currentOptions: props.options,
          series: props.series,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
};

export const PrefilledThresholdAlertFlyout = ({ onClose }: { onClose(): void }) => {
  const { metricThresholdPrefill } = useAlertPrefillContext();
  const { groupBy, filterQuery, metrics } = metricThresholdPrefill;

  return <AlertFlyout options={{ groupBy, filterQuery, metrics }} visible setVisible={onClose} />;
};
