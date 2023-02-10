/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { LifecycleRuleExecutor } from '@kbn/rule-registry-plugin/server';
import { ExecutorType } from '@kbn/alerting-plugin/server';

import { Duration, toDurationUnit } from '../../../domain/models';
import { DefaultSLIClient, KibanaSavedObjectsSLORepository } from '../../../services/slo';
import { computeBurnRate } from '../../../domain/services';
import {
  AlertStates,
  BurnRateAlertContext,
  BurnRateAlertState,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
  BurnRateRuleTypeState,
} from './types';

const SHORT_WINDOW = 'SHORT_WINDOW';
const LONG_WINDOW = 'LONG_WINDOW';

export const getRuleExecutor = (): LifecycleRuleExecutor<
  BurnRateRuleParams,
  BurnRateRuleTypeState,
  BurnRateAlertState,
  BurnRateAlertContext,
  BurnRateAllowedActionGroups
> =>
  async function executor({
    services,
    params,
    startedAt,
  }): ReturnType<
    ExecutorType<
      BurnRateRuleParams,
      BurnRateRuleTypeState,
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups
    >
  > {
    const {
      alertWithLifecycle,
      savedObjectsClient: soClient,
      scopedClusterClient: esClient,
      alertFactory,
    } = services;

    const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
    const summaryClient = new DefaultSLIClient(esClient.asCurrentUser);
    const slo = await sloRepository.findById(params.sloId);

    const longWindowDuration = new Duration(
      params.longWindow.value,
      toDurationUnit(params.longWindow.unit)
    );
    const shortWindowDuration = new Duration(
      params.shortWindow.value,
      toDurationUnit(params.shortWindow.unit)
    );

    const sliData = await summaryClient.fetchSLIDataFrom(slo, [
      { name: LONG_WINDOW, duration: longWindowDuration.add(slo.settings.syncDelay) },
      { name: SHORT_WINDOW, duration: shortWindowDuration.add(slo.settings.syncDelay) },
    ]);

    const longWindowBurnRate = computeBurnRate(slo, sliData[LONG_WINDOW]);
    const shortWindowBurnRate = computeBurnRate(slo, sliData[SHORT_WINDOW]);

    const shouldAlert =
      longWindowBurnRate >= params.burnRateThreshold &&
      shortWindowBurnRate >= params.burnRateThreshold;

    if (shouldAlert) {
      const reason = buildReason(
        longWindowDuration,
        longWindowBurnRate,
        shortWindowDuration,
        shortWindowBurnRate,
        params
      );

      const context = {
        longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
        reason,
        shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
        burnRateThreshold: params.burnRateThreshold,
        timestamp: startedAt.toISOString(),
      };

      const alert = alertWithLifecycle({
        id: `alert-${slo.id}-${slo.revision}`,
        fields: {
          [ALERT_REASON]: reason,
          [ALERT_EVALUATION_THRESHOLD]: params.burnRateThreshold,
          [ALERT_EVALUATION_VALUE]: Math.min(longWindowBurnRate, shortWindowBurnRate),
        },
      });

      alert.scheduleActions(FIRED_ACTION.id, context);
      alert.replaceState({ alertState: AlertStates.ALERT });
    }

    const { getRecoveredAlerts } = alertFactory.done();
    const recoveredAlerts = getRecoveredAlerts();
    for (const recoveredAlert of recoveredAlerts) {
      const context = {
        longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
        shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
        burnRateThreshold: params.burnRateThreshold,
        timestamp: startedAt.toISOString(),
      };

      recoveredAlert.setContext(context);
    }

    return { state: {} };
  };

const FIRED_ACTION_ID = 'slo.burnRate.fired';
export const FIRED_ACTION = {
  id: FIRED_ACTION_ID,
  name: i18n.translate('xpack.observability.slo.alerting.burnRate.fired', {
    defaultMessage: 'Alert',
  }),
};

function buildReason(
  longWindowDuration: Duration,
  longWindowBurnRate: number,
  shortWindowDuration: Duration,
  shortWindowBurnRate: number,
  params: BurnRateRuleParams
) {
  return i18n.translate('xpack.observability.slo.alerting.burnRate.reason', {
    defaultMessage:
      'The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {burnRateThreshold} for both windows',
    values: {
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate,
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate,
      burnRateThreshold: params.burnRateThreshold,
    },
  });
}
