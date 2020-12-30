/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
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
        alertTypeId: METRIC_THRESHOLD_ALERT_TYPE_ID,
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
