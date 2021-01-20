/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';
import { getMetricsHostsAnomalies, getMetricK8sAnomalies, MappedAnomalyHit } from '../../infra_ml';
import { AlertStates } from '../common/types';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
} from '../../../../../alerts/common';
import { AlertExecutorOptions } from '../../../../../alerts/server';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { MetricAnomalyAllowedActionGroups } from './register_metric_anomaly_alert_type';
import { MlPluginSetup } from '../../../../../ml/server';
import { KibanaRequest } from '../../../../../../../src/core/server';
import { InfraBackendLibs } from '../../infra_types';

export const createMetricAnomalyExecutor = (libs: InfraBackendLibs, ml?: MlPluginSetup) => async ({
  services,
  params,
  startedAt,
  previousStartedAt,
}: AlertExecutorOptions<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  MetricAnomalyAllowedActionGroups
>) => {
  if (!ml) {
    return;
  }
  const request = {} as KibanaRequest;
  const mlSystem = ml.mlSystemProvider(request, services.savedObjectsClient);
  const mlAnomalyDetectors = ml.anomalyDetectorsProvider(request, services.savedObjectsClient);

  const {
    metric,
    alertInterval,
    filterQuery,
    sourceId,
    nodeType,
    threshold,
  } = params as MetricAnomalyParams;

  const alertInstance = services.alertInstanceFactory(
    `${nodeType}-${metric}-${filterQuery ?? '*'}`
  );

  const endTime = startedAt.getTime();
  const startTime =
    previousStartedAt?.getTime() ?? endTime - getIntervalInSeconds(alertInterval) * 1000;
  const getAnomalies = nodeType === 'k8s' ? getMetricK8sAnomalies : getMetricsHostsAnomalies;

  const { data } = await getAnomalies(
    {
      spaceId: 'default',
      mlSystem,
      mlAnomalyDetectors,
    },
    sourceId ?? 'default',
    startTime,
    endTime,
    metric,
    { field: 'anomalyScore', direction: 'desc' },
    { pageSize: 10 },
    threshold
  );

  const shouldAlertFire = data.some(
    (anomaly: MappedAnomalyHit) => anomaly.anomalyScore >= threshold
  );

  if (shouldAlertFire) {
    alertInstance.scheduleActions(FIRED_ACTIONS_ID, {
      alertState: AlertStates.ALERT,
      timestamp: moment().toISOString(),
    });
  }
};

export const FIRED_ACTIONS_ID = 'metrics.anomaly.fired';
export const FIRED_ACTIONS: ActionGroup<typeof FIRED_ACTIONS_ID> = {
  id: FIRED_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.anomaly.fired', {
    defaultMessage: 'Fired',
  }),
};
