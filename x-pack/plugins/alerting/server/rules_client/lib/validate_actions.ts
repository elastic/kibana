/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { RawRule, RuleNotifyWhen } from '../../types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { NormalizedAlertActionOptionalUuid } from '../types';
import { RulesClientContext } from '../types';
import { parseDuration } from '../../lib';

export async function validateActions<U extends NormalizedAlertActionOptionalUuid>(
  context: RulesClientContext,
  alertType: UntypedNormalizedRuleType,
  data: Pick<RawRule, 'notifyWhen' | 'throttle' | 'schedule'> & { actions: U[] }
): Promise<void> {
  const { actions, notifyWhen, throttle } = data;
  const hasRuleLevelNotifyWhen = typeof notifyWhen !== 'undefined';
  const hasRuleLevelThrottle = Boolean(throttle);
  if (actions.length === 0) {
    return;
  }

  // check for actions using connectors with missing secrets
  const actionsClient = await context.getActionsClient();
  const actionIds = [...new Set(actions.map((action) => action.id))];
  const actionResults = (await actionsClient.getBulk(actionIds)) || [];
  const actionsUsingConnectorsWithMissingSecrets = actionResults.filter(
    (result) => result.isMissingSecrets
  );

  if (actionsUsingConnectorsWithMissingSecrets.length) {
    throw Boom.badRequest(
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

  // check for actions with invalid action groups
  const { actionGroups: alertTypeActionGroups } = alertType;
  const usedAlertActionGroups = actions.map((action) => action.group);
  const availableAlertTypeActionGroups = new Set(map(alertTypeActionGroups, 'id'));
  const invalidActionGroups = usedAlertActionGroups.filter(
    (group) => !availableAlertTypeActionGroups.has(group)
  );
  if (invalidActionGroups.length) {
    throw Boom.badRequest(
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
      throw Boom.badRequest(
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
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.rulesClient.validateActions.notAllActionsWithFreq', {
          defaultMessage: 'Actions missing frequency parameters: {groups}',
          values: {
            groups: actionsWithoutFrequency.map((a) => a.group).join(', '),
          },
        })
      );
    }
  }

  // check for actions throttled shorter than the rule schedule
  const scheduleInterval = parseDuration(data.schedule.interval);
  const actionsWithInvalidThrottles = actions.filter(
    (action) =>
      action.frequency?.notifyWhen === RuleNotifyWhen.THROTTLE &&
      parseDuration(action.frequency.throttle!) < scheduleInterval
  );
  if (actionsWithInvalidThrottles.length) {
    throw Boom.badRequest(
      i18n.translate('xpack.alerting.rulesClient.validateActions.actionsWithInvalidThrottles', {
        defaultMessage:
          'Action throttle cannot be shorter than the schedule interval of {scheduleIntervalText}: {groups}',
        values: {
          scheduleIntervalText: data.schedule.interval,
          groups: actionsWithInvalidThrottles
            .map((a) => `${a.group} (${a.frequency?.throttle})`)
            .join(', '),
        },
      })
    );
  }
}
