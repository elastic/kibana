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

import { sortBy, memoize, last } from 'lodash';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../common/field_names/infra_metrics';
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
import { ALERT_ACTION_ID } from '../../../../common/constants';

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

  const sliData = await summaryClient.fetchSLIDataFrom(slo, [
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
  if (params.windows && params.windows.length > 0) {
    const evalWindow = memoize(async (windowDef: WindowSchema) =>
      evaluateWindow(slo, summaryClient, windowDef)
    );
    const sortedWindows = sortBy(params.windows, (windowDef) => windowDef.longWindow.value);
    for (const windowDef of sortedWindows) {
      const result = await evalWindow(windowDef);
      if (result.shouldAlert) {
        return result;
      }
    }
    // If none of the previous windows match, we need to return the last window
    // for the recovery context. Since evalWindow is memoized, it shouldn't make
    // and additional call to evaulateWindow.
    return await evalWindow(last(sortedWindows) as WindowSchema);
  } else if (
    params.shortWindow &&
    params.longWindow &&
    params.burnRateThreshold != null &&
    params.maxBurnRateThreshold != null
  ) {
    const legacyWindowDef: WindowSchema = {
      id: 'legacy',
      maxBurnRateThreshold: params.maxBurnRateThreshold,
      actionGroup: ALERT_ACTION_ID,
      shortWindow: params.shortWindow,
      longWindow: params.longWindow,
      burnRateThreshold: params.burnRateThreshold,
    };
    const result = await evaluateWindow(slo, summaryClient, legacyWindowDef);
    return result;
  }
}

export const getRuleExecutor = ({
  basePath,
}: {
  basePath: IBasePath;
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
          longWindowDuration,
          longWindowBurnRate,
          shortWindowDuration,
          shortWindowBurnRate,
          windowDef
        );

        const context = {
          longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
          reason,
          shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
          burnRateThreshold: windowDef.burnRateThreshold,
          timestamp: startedAt.toISOString(),
          viewInAppUrl,
          sloId: slo.id,
          sloName: slo.name,
        };

        const alert = alertWithLifecycle({
          id: `alert-${slo.id}-${slo.revision}`,
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
        const context = {
          longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
          shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
          burnRateThreshold: windowDef.burnRateThreshold,
          timestamp: startedAt.toISOString(),
          viewInAppUrl,
          sloId: slo.id,
          sloName: slo.name,
        };

        recoveredAlert.setContext(context);
      }
    }

    return { state: {} };
  };

function buildReason(
  longWindowDuration: Duration,
  longWindowBurnRate: number,
  shortWindowDuration: Duration,
  shortWindowBurnRate: number,
  windowDef: WindowSchema
) {
  return i18n.translate('xpack.observability.slo.alerting.burnRate.reason', {
    defaultMessage:
      'The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {burnRateThreshold} for both windows',
    values: {
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
      burnRateThreshold: windowDef.burnRateThreshold,
    },
  });
}
