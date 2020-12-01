/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { AlertAdd } from '../../../../../triggers_actions_ui/public';
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
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  return (
    <>
      {triggersActionsUI && (
        <AlertAdd
          addFlyoutVisible={props.visible!}
          setAddFlyoutVisibility={props.setVisible}
          alertTypeId={METRIC_THRESHOLD_ALERT_TYPE_ID}
          canChangeTrigger={false}
          consumer={'infrastructure'}
          metadata={{
            currentOptions: props.options,
            series: props.series,
          }}
          actionTypeRegistry={triggersActionsUI.actionTypeRegistry}
          alertTypeRegistry={triggersActionsUI.alertTypeRegistry}
        />
      )}
    </>
  );
};
