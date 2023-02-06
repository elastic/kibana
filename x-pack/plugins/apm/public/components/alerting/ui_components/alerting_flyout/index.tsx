/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ApmRuleType,
  APM_SERVER_FEATURE_ID,
} from '../../../../../common/rules/apm_rule_types';
import { getInitialAlertValues } from '../../utils/get_initial_alert_values';
import { ApmPluginStartDeps } from '../../../../plugin';
import { useServiceName } from '../../../../hooks/use_service_name';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { AlertMetadata } from '../../utils/helper';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  ruleType: ApmRuleType | null;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, ruleType } = props;

  const serviceName = useServiceName();
  const { query } = useApmParams('/*');

  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  const environment =
    'environment' in query ? query.environment : ENVIRONMENT_ALL.value;
  const transactionType =
    'transactionType' in query ? query.transactionType : undefined;

  const { services } = useKibana<ApmPluginStartDeps>();
  const initialValues = getInitialAlertValues(ruleType, serviceName);

  const onCloseAddFlyout = useCallback(
    () => setAddFlyoutVisibility(false),
    [setAddFlyoutVisibility]
  );

  const addAlertFlyout = useMemo(
    () =>
      ruleType &&
      services.triggersActionsUi.getAddAlertFlyout({
        consumer: APM_SERVER_FEATURE_ID,
        onClose: onCloseAddFlyout,
        ruleTypeId: ruleType,
        canChangeTrigger: false,
        initialValues,
        metadata: {
          environment,
          serviceName,
          ...(ruleType === ApmRuleType.ErrorCount ? {} : { transactionType }),
          start,
          end,
        } as AlertMetadata,
      }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [
      ruleType,
      environment,
      onCloseAddFlyout,
      services.triggersActionsUi,
      serviceName,
      transactionType,
      environment,
      start,
      end,
    ]
  );
  return <>{addFlyoutVisible && addAlertFlyout}</>;
}
