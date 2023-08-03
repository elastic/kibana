/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { LifecycleRuleExecutor } from '@kbn/rule-registry-plugin/server';
import { ExecutorType } from '@kbn/alerting-plugin/server';
import { IBasePath } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';

import { memoize, last, upperCase } from 'lodash';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { AlertsLocatorParams, getAlertUrl } from '../../../../common';
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../common/field_names/slo';
import { Duration, SLO, toDurationUnit } from '../../../domain/models';
import { DefaultSLIClient, KibanaSavedObjectsSLORepository } from '../../../services/slo';
import { computeBurnRate } from '../../../domain/services';
import {
  AlertStates,
  BurnRateAlertContext,
  BurnRateAlertState,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
  BurnRateRuleTypeState,
  WindowSchema,
} from './types';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
} from '../../../../common/constants';

const SHORT_WINDOW = 'SHORT_WINDOW';
const LONG_WINDOW = 'LONG_WINDOW';

async function evaluateWindow(slo: SLO, summaryClient: DefaultSLIClient, windowDef: WindowSchema) {
  const longWindowDuration = new Duration(
    windowDef.longWindow.value,
    toDurationUnit(windowDef.longWindow.unit)
  );
  const shortWindowDuration = new Duration(
    windowDef.shortWindow.value,
    toDurationUnit(windowDef.shortWindow.unit)
  );

  const sliData = await summaryClient.fetchSLIDataFrom(slo, undefined, [
    { name: LONG_WINDOW, duration: longWindowDuration.add(slo.settings.syncDelay) },
    { name: SHORT_WINDOW, duration: shortWindowDuration.add(slo.settings.syncDelay) },
  ]);

  const longWindowBurnRate = computeBurnRate(slo, sliData[LONG_WINDOW]);
  const shortWindowBurnRate = computeBurnRate(slo, sliData[SHORT_WINDOW]);

  const shouldAlert =
    longWindowBurnRate >= windowDef.burnRateThreshold &&
    shortWindowBurnRate >= windowDef.burnRateThreshold;

  return {
    shouldAlert,
    longWindowBurnRate,
    shortWindowBurnRate,
    longWindowDuration,
    shortWindowDuration,
    window: windowDef,
  };
}

async function evaluate(slo: SLO, summaryClient: DefaultSLIClient, params: BurnRateRuleParams) {
  const evalWindow = memoize(async (windowDef: WindowSchema) =>
    evaluateWindow(slo, summaryClient, windowDef)
  );
  for (const windowDef of params.windows) {
    const result = await evalWindow(windowDef);
    if (result.shouldAlert) {
      return result;
    }
  }
  // If none of the previous windows match, we need to return the last window
  // for the recovery context. Since evalWindow is memoized, it shouldn't make
  // and additional call to evaulateWindow.
  return await evalWindow(last(params.windows) as WindowSchema);
}

export const getRuleExecutor = ({
  basePath,
  alertsLocator,
}: {
  basePath: IBasePath;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}): LifecycleRuleExecutor<
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
    spaceId,
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
      getAlertStartedDate,
      getAlertUuid,
    } = services;

    const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
    const summaryClient = new DefaultSLIClient(esClient.asCurrentUser);
    const slo = await sloRepository.findById(params.sloId);

    if (!slo.enabled) {
      return { state: {} };
    }

    const result = await evaluate(slo, summaryClient, params);

    if (result) {
      const {
        shouldAlert,
        longWindowDuration,
        longWindowBurnRate,
        shortWindowDuration,
        shortWindowBurnRate,
        window: windowDef,
      } = result;

      const viewInAppUrl = addSpaceIdToPath(
        basePath.publicBaseUrl,
        spaceId,
        `/app/observability/slos/${slo.id}`
      );

      if (shouldAlert) {
        const reason = buildReason(
          windowDef.actionGroup,
          longWindowDuration,
          longWindowBurnRate,
          shortWindowDuration,
          shortWindowBurnRate,
          windowDef
        );

        const alertId = `alert-${slo.id}-${slo.revision}`;
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
        const alertUuid = getAlertUuid(alertId);
        const alertDetailsUrl = await getAlertUrl(
          alertUuid,
          spaceId,
          indexedStartedAt,
          alertsLocator,
          basePath.publicBaseUrl
        );

        const context = {
          alertDetailsUrl,
          reason,
          longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
          shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
          burnRateThreshold: windowDef.burnRateThreshold,
          timestamp: startedAt.toISOString(),
          viewInAppUrl,
          sloId: slo.id,
          sloName: slo.name,
        };

        const alert = alertWithLifecycle({
          id: alertId,
          fields: {
            [ALERT_REASON]: reason,
            [ALERT_EVALUATION_THRESHOLD]: windowDef.burnRateThreshold,
            [ALERT_EVALUATION_VALUE]: Math.min(longWindowBurnRate, shortWindowBurnRate),
            [SLO_ID_FIELD]: slo.id,
            [SLO_REVISION_FIELD]: slo.revision,
          },
        });

        alert.scheduleActions(windowDef.actionGroup, context);
        alert.replaceState({ alertState: AlertStates.ALERT });
      }

      const { getRecoveredAlerts } = alertFactory.done();
      const recoveredAlerts = getRecoveredAlerts();
      for (const recoveredAlert of recoveredAlerts) {
        const alertId = `alert-${slo.id}-${slo.revision}`;
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
        const alertUuid = getAlertUuid(alertId);
        const alertDetailsUrl = await getAlertUrl(
          alertUuid,
          spaceId,
          indexedStartedAt,
          alertsLocator,
          basePath.publicBaseUrl
        );
        const context = {
          longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
          shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
          burnRateThreshold: windowDef.burnRateThreshold,
          timestamp: startedAt.toISOString(),
          viewInAppUrl,
          alertDetailsUrl,
          sloId: slo.id,
          sloName: slo.name,
        };

        recoveredAlert.setContext(context);
      }
    }

    return { state: {} };
  };

function getActionGroupName(id: string) {
  switch (id) {
    case HIGH_PRIORITY_ACTION.id:
      return HIGH_PRIORITY_ACTION.name;
    case MEDIUM_PRIORITY_ACTION.id:
      return MEDIUM_PRIORITY_ACTION.name;
    case LOW_PRIORITY_ACTION.id:
      return LOW_PRIORITY_ACTION.name;
    default:
      return ALERT_ACTION.name;
  }
}

function buildReason(
  actionGroup: string,
  longWindowDuration: Duration,
  longWindowBurnRate: number,
  shortWindowDuration: Duration,
  shortWindowBurnRate: number,
  windowDef: WindowSchema
) {
  return i18n.translate('xpack.observability.slo.alerting.burnRate.reason', {
    defaultMessage:
      '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {burnRateThreshold} for both windows',
    values: {
      actionGroupName: upperCase(getActionGroupName(actionGroup)),
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
      burnRateThreshold: windowDef.burnRateThreshold,
    },
  });
}
