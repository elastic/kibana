/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { validateHours } from '../../routes/lib/validate_hours';
import { RawRule, RuleNotifyWhen } from '../../types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { NormalizedAlertAction } from '../types';
import { RulesClientContext } from '../types';
import { parseDuration } from '../../lib';

export type ValidateActionsData = Pick<RawRule, 'notifyWhen' | 'throttle' | 'schedule'> & {
  actions: NormalizedAlertAction[];
};

export async function validateActions(
  context: RulesClientContext,
  ruleType: UntypedNormalizedRuleType,
  data: ValidateActionsData,
  allowMissingConnectorSecrets?: boolean
): Promise<void> {
  const { actions, notifyWhen, throttle } = data;
  const hasRuleLevelNotifyWhen = typeof notifyWhen !== 'undefined';
  const hasRuleLevelThrottle = Boolean(throttle);
  if (actions.length === 0) {
    return;
  }

  const errors = [];

  const uniqueActions = new Set(actions.map((action) => action.uuid));
  if (uniqueActions.size < actions.length) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.hasDuplicatedUuid', {
        defaultMessage: 'Actions have duplicated UUIDs',
      })
    );
  }

  // check for actions using connectors with missing secrets
  const actionsClient = await context.getActionsClient();
  const actionIds = [...new Set(actions.map((action) => action.id))];
  const actionResults = (await actionsClient.getBulk(actionIds)) || [];
  const actionsUsingConnectorsWithMissingSecrets = actionResults.filter(
    (result) => result.isMissingSecrets
  );
  if (actionsUsingConnectorsWithMissingSecrets.length) {
    if (allowMissingConnectorSecrets) {
      context.logger.error(
        `Invalid connectors with "allowMissingConnectorSecrets": ${actionsUsingConnectorsWithMissingSecrets
          .map((connector) => connector.name)
          .join(', ')}`
      );
    } else {
      errors.push(
        i18n.translate('xpack.alerting.rulesClient.validateActions.misconfiguredConnector', {
          defaultMessage: 'Invalid connectors: {groups}',
          values: {
            groups: actionsUsingConnectorsWithMissingSecrets
              .map((connector) => connector.name)
              .join(', '),
          },
        })
      );
    }
  }
  // check for actions with invalid action groups
  const { actionGroups: alertTypeActionGroups } = ruleType;
  const usedAlertActionGroups = actions.map((action) => action.group);
  const availableAlertTypeActionGroups = new Set(map(alertTypeActionGroups, 'id'));
  const invalidActionGroups = usedAlertActionGroups.filter(
    (group) => !availableAlertTypeActionGroups.has(group)
  );
  if (invalidActionGroups.length) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.invalidGroups', {
        defaultMessage: 'Invalid action groups: {groups}',
        values: {
          groups: invalidActionGroups.join(', '),
        },
      })
    );
  }

  // check for actions using frequency params if the rule has rule-level frequency params defined
  if (hasRuleLevelNotifyWhen || hasRuleLevelThrottle) {
    const actionsWithFrequency = actions.filter((action) => Boolean(action.frequency));
    if (actionsWithFrequency.length) {
      errors.push(
        i18n.translate('xpack.alerting.rulesClient.validateActions.mixAndMatchFreqParams', {
          defaultMessage:
            'Cannot specify per-action frequency params when notify_when or throttle are defined at the rule level: {groups}',
          values: {
            groups: actionsWithFrequency.map((a) => a.group).join(', '),
          },
        })
      );
    }
  } else {
    const actionsWithoutFrequency = actions.filter((action) => !action.frequency);
    if (actionsWithoutFrequency.length) {
      errors.push(
        i18n.translate('xpack.alerting.rulesClient.validateActions.notAllActionsWithFreq', {
          defaultMessage: 'Actions missing frequency parameters: {groups}',
          values: {
            groups: actionsWithoutFrequency.map((a) => a.group).join(', '),
          },
        })
      );
    }
  }

  const scheduleInterval = parseDuration(data.schedule.interval);
  const actionsWithInvalidThrottles = [];
  const actionWithoutQueryAndTimeframe = [];
  const actionWithInvalidTimeframe = [];
  const actionsWithInvalidTimeRange = [];
  const actionsWithInvalidDays = [];
  const actionsWithAlertsFilterWithoutSummaryGetter = [];

  for (const action of actions) {
    const { alertsFilter } = action;

    // check for actions throttled shorter than the rule schedule
    if (
      action.frequency?.notifyWhen === RuleNotifyWhen.THROTTLE &&
      parseDuration(action.frequency.throttle!) < scheduleInterval
    ) {
      actionsWithInvalidThrottles.push(action);
    }

    if (alertsFilter) {
      // Action has alertsFilter but the ruleType does not support AAD
      if (!ruleType.getSummarizedAlerts) {
        actionsWithAlertsFilterWithoutSummaryGetter.push(action);
      }

      // alertsFilter must have at least one of query and timeframe
      if (!alertsFilter.query && !alertsFilter.timeframe) {
        actionWithoutQueryAndTimeframe.push(action);
      }
      if (alertsFilter.timeframe) {
        // hours, days and timezone fields are required
        if (
          !alertsFilter.timeframe.hours ||
          !alertsFilter.timeframe.days ||
          !alertsFilter.timeframe.timezone
        ) {
          actionWithInvalidTimeframe.push(action);
        }
        if (alertsFilter.timeframe.hours) {
          if (
            validateHours(alertsFilter.timeframe.hours.start) ||
            validateHours(alertsFilter.timeframe.hours.end)
          ) {
            actionsWithInvalidTimeRange.push(action);
          }
        }
        if (alertsFilter.timeframe.days) {
          if (alertsFilter.timeframe.days.some((day) => ![1, 2, 3, 4, 5, 6, 7].includes(day))) {
            actionsWithInvalidDays.push(action);
          }
        }
      }
    }
  }

  if (actionsWithInvalidThrottles.length > 0) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionsWithInvalidThrottles', {
        defaultMessage:
          'Action frequency cannot be shorter than the schedule interval of {scheduleIntervalText}: {groups}',
        values: {
          scheduleIntervalText: data.schedule.interval,
          groups: actionsWithInvalidThrottles
            .map((a) => `${a.group} (${a.frequency?.throttle})`)
            .join(', '),
        },
      })
    );
  }

  if (actionWithoutQueryAndTimeframe.length > 0) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionsWithInvalidAlertsFilter', {
        defaultMessage: `Action's alertsFilter  must have either "query" or "timeframe" : {uuids}`,
        values: {
          uuids: actionWithoutQueryAndTimeframe.map((a) => `${a.uuid}`).join(', '),
        },
      })
    );
  }

  if (actionWithInvalidTimeframe.length > 0) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionWithInvalidTimeframe', {
        defaultMessage: `Action's alertsFilter timeframe has missing fields: days, hours or timezone: {uuids}`,
        values: {
          uuids: actionWithInvalidTimeframe.map((a) => a.uuid).join(', '),
        },
      })
    );
  }

  if (actionsWithInvalidDays.length > 0) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionsWithInvalidDays', {
        defaultMessage: `Action's alertsFilter days has invalid values: {uuidAndDays}`,
        values: {
          uuidAndDays: actionsWithInvalidDays
            .map((a) => `(${a.uuid}:[${a.alertsFilter!.timeframe!.days}]) `)
            .join(', '),
        },
      })
    );
  }

  if (actionsWithInvalidTimeRange.length > 0) {
    errors.push(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionsWithInvalidTimeRange', {
        defaultMessage: `Action's alertsFilter time range has an invalid value: {hours}`,
        values: {
          hours: actionsWithInvalidTimeRange
            .map(
              (a) =>
                `${a.alertsFilter!.timeframe!.hours.start}-${a.alertsFilter!.timeframe!.hours.end}`
            )
            .join(', '),
        },
      })
    );
  }

  if (actionsWithAlertsFilterWithoutSummaryGetter.length > 0) {
    errors.push(
      i18n.translate(
        'xpack.alerting.rulesClient.validateActions.actionsWithAlertsFilterWithoutSummaryGetter',
        {
          defaultMessage: `This ruleType ({ruleType}) can't have an action with Alerts Filter. Actions: [{uuids}]`,
          values: {
            uuids: actionsWithAlertsFilterWithoutSummaryGetter.map((a) => a.uuid).join(', '),
            ruleType: ruleType.name,
          },
        }
      )
    );
  }

  // Finalize and throw any errors present
  if (errors.length) {
    throw Boom.badRequest(
      i18n.translate('xpack.alerting.rulesClient.validateActions.errorSummary', {
        defaultMessage:
          'Failed to validate actions due to the following {errorNum, plural, one {error:} other {# errors:\n-}} {errorList}',
        values: {
          errorNum: errors.length,
          errorList: errors.join('\n- '),
        },
      })
    );
  }
}
