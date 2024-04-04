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
import { AlertsClientError, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { IBasePath } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';

import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { ALL_VALUE, DurationUnit, toDurationUnit } from '@kbn/slo-schema';
import { AlertsLocatorParams, getAlertUrl } from '@kbn/observability-plugin/common';
import { ObservabilitySloAlert } from '@kbn/alerts-as-data-utils';
import { ExecutorType } from '@kbn/alerting-plugin/server';
import { upperCase } from 'lodash';
import {
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
  SLO_SERVERITY_HISTORY_FIELD,
} from '../../../../common/field_names/slo';
import { Duration } from '../../../domain/models';
import { KibanaSavedObjectsSLORepository } from '../../../services';
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
  SUPPRESSED_PRIORITY_ACTION,
  IMPROVING_PRIORITY_ACTION,
} from '../../../../common/constants';
import { evaluate } from './lib/evaluate';
import { evaluateDependencies } from './lib/evaluate_dependencies';
import { shouldSuppressInstanceId } from './lib/should_suppress_instance_id';
import { computeActionGroup } from './lib/compute_action_group';
import { InstanceHistory, InstanceHistoryRecord } from '../../../../common/types';

export const getRuleExecutor = ({
  basePath,
  alertsLocator,
}: {
  basePath: IBasePath;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}) =>
  async function executor(
    options: RuleExecutorOptions<
      BurnRateRuleParams,
      BurnRateRuleTypeState,
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups,
      ObservabilitySloAlert
    >
  ): ReturnType<
    ExecutorType<
      BurnRateRuleParams,
      BurnRateRuleTypeState,
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups
    >
  > {
    const { services, params, logger, startedAt, spaceId, getTimeRange, state } = options;

    const { savedObjectsClient: soClient, scopedClusterClient: esClient, alertsClient } = services;

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const sloRepository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const slo = await sloRepository.findById(params.sloId);

    if (!slo.enabled) {
      return { state: { history: [] } };
    }

    // We only need the end timestamp to base all of queries on. The length of the time range
    // doesn't matter for our use case since we allow the user to customize the window sizes,
    const { dateEnd } = getTimeRange('1m');
    const results = await evaluate(esClient.asCurrentUser, slo, params, new Date(dateEnd));
    const history: InstanceHistory[] = [];

    const suppressResults =
      params.dependencies && results.some((res) => res.shouldAlert)
        ? (
            await evaluateDependencies(
              soClient,
              esClient.asCurrentUser,
              sloRepository,
              params.dependencies,
              new Date(dateEnd)
            )
          ).activeRules
        : [];

    if (results.length > 0) {
      const alertLimit = alertsClient.getAlertLimitValue();
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
          const shouldSuppress = shouldSuppressInstanceId(suppressResults, instanceId);
          if (scheduledActionsCount >= alertLimit) {
            // need to set this so that warning is displayed in the UI and in the logs
            hasReachedLimit = true;
            break; // once limit is reached, we break out of the loop and don't schedule any more alerts
          }

          const { actionGroup, latestHistoryEvent, historyRecord } = computeActionGroup(
            new Date(dateEnd),
            state.history || [],
            instanceId,
            windowDef.actionGroup,
            shouldSuppress
          );

          // If the alert has been improving for too long, then we need to stop
          // maintain the current status and let it recover so the next status
          // can trigger a new event
          if (alertHasBeenImprovingTooLong(windowDef, latestHistoryEvent)) {
            break;
          }

          history.push(historyRecord);

          const reason = buildReason(
            instanceId,
            windowDef.actionGroup,
            longWindowDuration,
            longWindowBurnRate,
            shortWindowDuration,
            shortWindowBurnRate,
            windowDef,
            shouldSuppress,
            latestHistoryEvent?.improvingFrom
          );

          const alertId = instanceId;

          const { uuid, start } = alertsClient.report({
            id: alertId,
            actionGroup,
            state: {
              alertState: AlertStates.ALERT,
            },
            payload: {
              [ALERT_REASON]: reason,
              [ALERT_EVALUATION_THRESHOLD]: windowDef.burnRateThreshold,
              [ALERT_EVALUATION_VALUE]: Math.min(longWindowBurnRate, shortWindowBurnRate),
              [SLO_ID_FIELD]: slo.id,
              [SLO_REVISION_FIELD]: slo.revision,
              [SLO_INSTANCE_ID_FIELD]: instanceId,
              [SLO_SERVERITY_HISTORY_FIELD]: historyRecord.history,
            },
          });

          const indexedStartedAt = start ?? startedAt.toISOString();
          const alertDetailsUrl = await getAlertUrl(
            uuid,
            spaceId,
            indexedStartedAt,
            alertsLocator,
            basePath.publicBaseUrl
          );

          const context: BurnRateAlertContext = {
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
            slo,
            suppressedAction: shouldSuppress ? windowDef.actionGroup : null,
          };

          if (latestHistoryEvent.improvingFrom) {
            context.previousActionGroup = latestHistoryEvent.improvingFrom;
            context.improvedActionGroup = latestHistoryEvent.actionGroup;
          }

          alertsClient.setAlertData({ id: alertId, context });
          scheduledActionsCount++;
        }
      }
      alertsClient.setAlertLimitReached(hasReachedLimit);
    }

    const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
    for (const recoveredAlert of recoveredAlerts) {
      const alertId = recoveredAlert.alert.getId();
      const indexedStartedAt = recoveredAlert.alert.getStart() ?? startedAt.toISOString();
      const alertUuid = recoveredAlert.alert.getUuid();
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

      alertsClient.setAlertData({
        id: alertId,
        context,
      });
    }

    return { state: { history } };
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
  windowDef: WindowSchema,
  suppressed: boolean,
  improvedFromActionGroup?: string
) {
  const actionGroupName = suppressed
    ? `${upperCase(SUPPRESSED_PRIORITY_ACTION.name)} - ${upperCase(
        getActionGroupName(actionGroup)
      )}`
    : improvedFromActionGroup
    ? `${upperCase(IMPROVING_PRIORITY_ACTION.name)} - ${upperCase(
        getActionGroupName(improvedFromActionGroup)
      )} -> ${upperCase(getActionGroupName(actionGroup))}`
    : upperCase(getActionGroupName(actionGroup));
  if (instanceId === ALL_VALUE) {
    return i18n.translate('xpack.slo.alerting.burnRate.reason', {
      defaultMessage:
        '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {burnRateThreshold} for both windows',
      values: {
        actionGroupName,
        longWindowDuration: longWindowDuration.format(),
        longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
        shortWindowDuration: shortWindowDuration.format(),
        shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
        burnRateThreshold: windowDef.burnRateThreshold,
      },
    });
  }
  return i18n.translate('xpack.slo.alerting.burnRate.reasonForInstanceId', {
    defaultMessage:
      '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate} for {instanceId}. Alert when above {burnRateThreshold} for both windows',
    values: {
      actionGroupName,
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
      burnRateThreshold: windowDef.burnRateThreshold,
      instanceId,
    },
  });
}

function alertHasBeenImprovingTooLong(
  windowDef: WindowSchema,
  latestHistoryEvent: InstanceHistoryRecord
) {
  if (!latestHistoryEvent.improvingFrom) {
    return false;
  }

  const windowDuration = new Duration(
    windowDef.longWindow.value,
    toDurationUnit(windowDef.longWindow.unit)
  );
  const eventDurationInMinutes = (Date.now() - latestHistoryEvent.timerange.from) / 60_000;
  const eventDuration = new Duration(eventDurationInMinutes, DurationUnit.Minute);
  return !eventDuration.isShorterThan(windowDuration);
}
