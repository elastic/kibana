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

import { upperCase } from 'lodash';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { ALL_VALUE } from '@kbn/slo-schema';
import { AlertsLocatorParams, getAlertUrl } from '../../../../common';
import {
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
} from '../../../../common/field_names/slo';
import { Duration } from '../../../domain/models';
import { KibanaSavedObjectsSLORepository } from '../../../services/slo';
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
import { evaluate } from './lib/evaluate';

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
    getTimeRange,
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
    const slo = await sloRepository.findById(params.sloId);

    if (!slo.enabled) {
      return { state: {} };
    }

    // We only need the end timestamp to base all of queries on. The length of the time range
    // doesn't matter for our use case since we allow the user to customize the window sizes,
    const { dateEnd } = getTimeRange('1m');
    const results = await evaluate(esClient.asCurrentUser, slo, params, new Date(dateEnd));

    if (results.length > 0) {
      const alertLimit = alertFactory.alertLimit.getValue();
      let hasReachedLimit = false;
      let scheduledActionsCount = 0;
      for (const result of results) {
        const {
          instanceId,
          shouldAlert,
          longWindowDuration,
          longWindowBurnRate,
          shortWindowDuration,
          shortWindowBurnRate,
          window: windowDef,
        } = result;

        const urlQuery = instanceId === ALL_VALUE ? '' : `?instanceId=${instanceId}`;
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          `/app/observability/slos/${slo.id}${urlQuery}`
        );
        if (shouldAlert) {
          if (scheduledActionsCount >= alertLimit) {
            // need to set this so that warning is displayed in the UI and in the logs
            hasReachedLimit = true;
            break; // once limit is reached, we break out of the loop and don't schedule any more alerts
          }
          const reason = buildReason(
            instanceId,
            windowDef.actionGroup,
            longWindowDuration,
            longWindowBurnRate,
            shortWindowDuration,
            shortWindowBurnRate,
            windowDef
          );

          const alertId = instanceId;
          const alert = alertWithLifecycle({
            id: alertId,
            fields: {
              [ALERT_REASON]: reason,
              [ALERT_EVALUATION_THRESHOLD]: windowDef.burnRateThreshold,
              [ALERT_EVALUATION_VALUE]: Math.min(longWindowBurnRate, shortWindowBurnRate),
              [SLO_ID_FIELD]: slo.id,
              [SLO_REVISION_FIELD]: slo.revision,
              [SLO_INSTANCE_ID_FIELD]: instanceId,
            },
          });
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
            sloInstanceId: instanceId,
          };

          alert.scheduleActions(windowDef.actionGroup, context);
          alert.replaceState({ alertState: AlertStates.ALERT });
          scheduledActionsCount++;
        }
      }
      alertFactory.alertLimit.setLimitReached(hasReachedLimit);
    }

    const { getRecoveredAlerts } = alertFactory.done();
    const recoveredAlerts = getRecoveredAlerts();
    for (const recoveredAlert of recoveredAlerts) {
      const alertId = recoveredAlert.getId();
      const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
      const alertUuid = recoveredAlert.getUuid();
      const alertDetailsUrl = await getAlertUrl(
        alertUuid,
        spaceId,
        indexedStartedAt,
        alertsLocator,
        basePath.publicBaseUrl
      );

      const urlQuery = alertId === ALL_VALUE ? '' : `?instanceId=${alertId}`;
      const viewInAppUrl = addSpaceIdToPath(
        basePath.publicBaseUrl,
        spaceId,
        `/app/observability/slos/${slo.id}${urlQuery}`
      );

      const context = {
        timestamp: startedAt.toISOString(),
        viewInAppUrl,
        alertDetailsUrl,
        sloId: slo.id,
        sloName: slo.name,
        sloInstanceId: alertId,
      };

      recoveredAlert.setContext(context);
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
  instanceId: string,
  actionGroup: string,
  longWindowDuration: Duration,
  longWindowBurnRate: number,
  shortWindowDuration: Duration,
  shortWindowBurnRate: number,
  windowDef: WindowSchema
) {
  if (instanceId === ALL_VALUE) {
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
  return i18n.translate('xpack.observability.slo.alerting.burnRate.reasonForInstanceId', {
    defaultMessage:
      '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate} for {instanceId}. Alert when above {burnRateThreshold} for both windows',
    values: {
      actionGroupName: upperCase(getActionGroupName(actionGroup)),
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
      burnRateThreshold: windowDef.burnRateThreshold,
      instanceId,
    },
  });
}
