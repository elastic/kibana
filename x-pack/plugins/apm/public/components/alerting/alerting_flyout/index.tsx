/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  AlertType,
  APM_SERVER_FEATURE_ID,
} from '../../../../common/alert_types';
import { getInitialAlertValues } from '../get_initial_alert_values';
import { ApmPluginStartDeps } from '../../../plugin';
import { useServiceName } from '../../../hooks/use_service_name';
import { useApmParams } from '../../../hooks/use_apm_params';
import { AlertMetadata } from '../helper';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertType: AlertType | null;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, alertType } = props;

  const serviceName = useServiceName();
  const { query } = useApmParams('/*');
  const {
    urlParams: { start, end },
  } = useUrlParams();
  const environment =
    'environment' in query ? query.environment : ENVIRONMENT_ALL.value;
  const transactionType =
    'transactionType' in query ? query.transactionType : undefined;

  const { services } = useKibana<ApmPluginStartDeps>();
  const initialValues = getInitialAlertValues(alertType, serviceName);

  const onCloseAddFlyout = useCallback(() => setAddFlyoutVisibility(false), [
    setAddFlyoutVisibility,
  ]);

  const addAlertFlyout = useMemo(
    () =>
      alertType &&
      services.triggersActionsUi.getAddAlertFlyout({
        consumer: APM_SERVER_FEATURE_ID,
        onClose: onCloseAddFlyout,
        alertTypeId: alertType,
        canChangeTrigger: false,
        initialValues,
        metadata: {
          environment,
          serviceName,
          transactionType,
          start,
          end,
        } as AlertMetadata,
      }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [
      alertType,
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
