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
import { ElasticsearchClient, IBasePath } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';

import { memoize, last, upperCase } from 'lodash';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { sloSchema } from '@kbn/slo-schema';
import { AlertsLocatorParams, getAlertUrl } from '../../../../common';
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../common/field_names/infra_metrics';
import { CompositeSLO, Duration, SLO, toDurationUnit } from '../../../domain/models';
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
import { KibanaSavedObjectsCompositeSLORepository } from '../../../services/composite_slo';
import { DefaultCompositeSLIClient } from '../../../services/composite_slo/sli_client';
import { CompositeSLOSourceRevisionMismatch, SLONotFound } from '../../../errors';

const SHORT_WINDOW = 'SHORT_WINDOW';
const LONG_WINDOW = 'LONG_WINDOW';

interface LookbackWindow {
  name: string;
  duration: Duration;
}

async function fetchSLIDataFrom(
  slo: SloORCompositeSlo,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  lookbackWindows: LookbackWindow[]
) {
  const sliClient = new DefaultSLIClient(esClient);
  if (sloSchema.is(slo)) {
    return sliClient.fetchSLIDataFrom(slo, lookbackWindows);
  }
  const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
  const compositeSliClient = new DefaultCompositeSLIClient(sliClient);
  return compositeSliClient.fetchSLIDataFrom(slo, lookbackWindows);
}

async function evaluateWindow(
  slo: SloORCompositeSlo,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  windowDef: WindowSchema
) {
  const longWindowDuration = new Duration(
    windowDef.longWindow.value,
    toDurationUnit(windowDef.longWindow.unit)
  );
  const shortWindowDuration = new Duration(
    windowDef.shortWindow.value,
    toDurationUnit(windowDef.shortWindow.unit)
  );

  const sliData = await fetchSLIDataFrom(slo, soClient, esClient, [
    { name: LONG_WINDOW, duration: longWindowDuration },
    { name: SHORT_WINDOW, duration: shortWindowDuration },
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

async function evaluate(
  slo: SloORCompositeSlo,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  params: BurnRateRuleParams
) {
  const evalWindow = memoize(async (windowDef: WindowSchema) =>
    evaluateWindow(slo, soClient, esClient, windowDef)
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

type SloORCompositeSlo = SLO | CompositeSLO;

async function findSloOrCompositeSlo(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<SloORCompositeSlo> {
  const sloRepository = new KibanaSavedObjectsSLORepository(soClient);
  try {
    return await sloRepository.findById(id);
  } catch (e) {
    const compositeSloRepository = new KibanaSavedObjectsCompositeSLORepository(soClient);
    const compositeSlo = await compositeSloRepository.findById(id);
    const sourceSlos = await sloRepository.findAllByIds(
      compositeSlo.sources.map((source) => source.id)
    );
    const sourcesWithSlo = compositeSlo.sources.map((source) => {
      const sourceSlo = sourceSlos.find((subject) => subject.id === source.id);
      if (!sourceSlo) {
        throw new SLONotFound(`SLO [${source.id}] not found`);
      }
      if (sourceSlo.revision !== source.revision) {
        throw new CompositeSLOSourceRevisionMismatch(
          `SLO [${source.id}] revision is ${sourceSlo.revision} when it should be ${source.revision}`
        );
      }
      return { ...source, slo: sourceSlo };
    });
    return { ...compositeSlo, sources: sourcesWithSlo };
  }
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

    const slo = await findSloOrCompositeSlo(soClient, params.sloId);

    if (sloSchema.is(slo) && !slo.enabled) {
      return { state: {} };
    }

    const result = await evaluate(slo, soClient, esClient.asCurrentUser, params);

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

        const revision = sloSchema.is(slo) ? slo.revision : 1;
        const alertId = `alert-${slo.id}-${revision}`;
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
            [SLO_REVISION_FIELD]: revision,
          },
        });

        alert.scheduleActions(windowDef.actionGroup, context);
        alert.replaceState({ alertState: AlertStates.ALERT });
      }

      const { getRecoveredAlerts } = alertFactory.done();
      const recoveredAlerts = getRecoveredAlerts();
      for (const recoveredAlert of recoveredAlerts) {
        const revision = sloSchema.is(slo) ? slo.revision : 1;
        const alertId = `alert-${slo.id}-${revision}`;
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
