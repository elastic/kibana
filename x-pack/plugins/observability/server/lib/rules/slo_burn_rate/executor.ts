/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { LifecycleRuleExecutor } from '@kbn/rule-registry-plugin/server';

import { Duration, toDurationUnit } from '../../../domain/models';
import { DefaultSLIClient, KibanaSavedObjectsSLORepository } from '../../../services/slo';
import { computeBurnRate } from '../../../domain/services';

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

export type BurnRateRuleParams = {
  sloId: string;
  threshold: number;
  longWindow: { duration: number; unit: string };
  shortWindow: { duration: number; unit: string };
} & Record<string, any>;
export type BurnRateRuleTypeState = RuleTypeState & {};
export type BurnRateAlertState = AlertState;
export type BurnRateAlertContext = AlertContext;
export type BurnRateAllowedActionGroups = ActionGroupIdsOf<typeof FIRED_ACTION>;

const SHORT_WINDOW = 'SHORT_WINDOW';
const LONG_WINDOW = 'LONG_WINDOW';

export const getRuleExecutor = (): LifecycleRuleExecutor<
  BurnRateRuleParams,
  BurnRateRuleTypeState,
  BurnRateAlertState,
  BurnRateAlertContext,
  BurnRateAllowedActionGroups
> =>
  async function executor({ services, params, startedAt }): Promise<void> {
    const {
      alertWithLifecycle,
      savedObjectsClient: soClient,
      scopedClusterClient: esClient,
      alertFactory,
    } = services;

    const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
    const sliClient = new DefaultSLIClient(esClient.asCurrentUser);
    const slo = await sloRepository.findById(params.sloId);

    const longWindowDuration = new Duration(
      params.longWindow.duration,
      toDurationUnit(params.longWindow.unit)
    );
    const shortWindowDuration = new Duration(
      params.shortWindow.duration,
      toDurationUnit(params.shortWindow.unit)
    );

    const sliData = await sliClient.fetchSLIDataFrom(slo, [
      { name: LONG_WINDOW, duration: longWindowDuration },
      { name: SHORT_WINDOW, duration: shortWindowDuration },
    ]);

    const longWindowBurnRate = computeBurnRate(slo, sliData[LONG_WINDOW]);
    const shortWindowBurnRate = computeBurnRate(slo, sliData[SHORT_WINDOW]);

    const shouldAlert =
      longWindowBurnRate >= params.threshold && shortWindowBurnRate >= params.threshold;

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
        threshold: params.threshold,
        timestamp: startedAt.toISOString(),
      };

      const alert = alertWithLifecycle({
        id: `alert-${slo.id}-${slo.revision}`,
        fields: {
          [ALERT_REASON]: reason,
          [ALERT_EVALUATION_THRESHOLD]: params.threshold,
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
        threshold: params.threshold,
        timestamp: startedAt.toISOString(),
      };

      recoveredAlert.setContext(context);
    }
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
      'The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {threshold} for both windows',
    values: {
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate,
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate,
      threshold: params.threshold,
    },
  });
}
